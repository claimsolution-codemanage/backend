import Tranaction from "../models/transaction.js";
import Bill from "../models/bill.js";
import { validMongooseId } from "../utils/helper.js";
import crypto from 'crypto'

const algo = 'aes-128-cbc';
const key = Buffer.from(process.env.AUTHKEY, 'utf-8');
const iv = Buffer.from(process.env.AUTHIV, 'utf-8');

function encrypt(data) {
   const cipher = crypto.createCipheriv(algo,key,iv);
   let encrypted = cipher.update(data, 'utf-8', 'base64');
   encrypted += cipher.final('base64');
   return encrypted
}

function decrypt(encryptedData){
   let decipher = crypto.createDecipheriv(algo,key,iv);
   let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
   decrypted += decipher.final('utf-8');
   return decrypted;
}




export const paymentCheckoutPage =async (req, res) => {
   
   try {
      const {transactionId} = req?.query
      if(!transactionId){
        return res.render("paymentError",{error:"Tranasaction id is requried"})
      }
      if(!validMongooseId(transactionId)){
         return res.render("paymentError",{error:"Tranasaction id is invalid/expired"})
      }
      const isValidTransaction = await Tranaction.findById(transactionId).populate("clientId").populate("invoiceId")
      if(!isValidTransaction){
        return res.render("paymentError",{error:"Tranasaction id is invalid/expired"})
      }

      const paymentStr = "payerName="+isValidTransaction.clientId?.profile?.consultantName.trim()+
      "&payerEmail="+isValidTransaction.clientId?.profile?.primaryEmail.trim()+"&payerMobile="+
      isValidTransaction.clientId?.profile?.primaryMobileNo.trim()+
      "&clientTxnId="+transactionId?.trim()+"&amount="+isValidTransaction?.invoiceId?.totalAmt+"&clientCode="+
      process?.env?.CLIENTCODE.trim()+"&transUserName="+process?.env?.TRANSUSERNAME.trim()+"&transUserPassword="+
      process?.env?.TRANSUSERPASSWORD.trim()+"&callbackUrl="+process?.env?.CALLBACKURL.trim()+"&amountType="+
      "INR"+"&mcc="+process?.env?.MCC.trim()+"&channelId="+"W".trim()+"&transDate="+new Date().getTime()



      console.log("paymentStr",paymentStr,iv,key);
      const encData = encrypt(paymentStr?.trim())

      console.log({encData:encData,clientCode:process?.env?.CLIENTCODE.trim()});
      return res.render("pgCheckout",{encData:encData,clientCode:process?.env?.CLIENTCODE.trim()})

   } catch (error) {
      console.log("paymentCheckoutPage in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const paymentConfirmation =async(req,res)=>{
   console.log("payment confirmation");
   try {
      if(!req.query?.data){
         return res?.status(400).json({message:"Invalid transaction"})
      }

      const decryptData = decrypt(req.query?.data)

      if(!decryptData){
         return res?.status(400).json({message:"Invaild Transaction"})

      }else{
         const dataArr = decryptData?.split("&")
         const obj = {};
         
         dataArr?.forEach(item => {
           const [key, value] = item.split('=');
           obj[key] = value;
         });

         if(obj && obj?.statusCode=='0000' && obj?.status=='SUCCESS' && obj?.clientTxnId){
            const getTransaction = await Tranaction.findById(obj?.clientTxnId)
            if(getTransaction){
               const getBill = await Bill.findByIdAndUpdate(getTransaction?.invoiceId,{
                  $set:{
                     isPaid:true,
                     transactionId:obj?.clientTxnId
                  }
               },{new:true})
               if(getBill){
                  const getTransactionDetails = await Tranaction.findByIdAndUpdate(obj?.clientTxnId,{
                     $set:{
                        isPaid:true,
                        paidAmount:obj?.paidAmount,
                       paymentMode:obj?.paymentMode,
                       status:obj?.status,
                       statusCode:obj?.statusCode,
                       sabPaisaTxnId:obj?.sabpaisaTxnId,
                       sabPaisaMessage:obj?.sabPaisaMessage,
                       transDate:obj?.transDate,
                       bankName:obj?.bankName,
                       info:obj
                     }
                  },{new:true})
                  return res?.status(200).json({message:"Successfully bill paid"})
               }else{
                  return res?.status(400).json({message:"Transaction bill not found"})
               }
            }else{
               return res?.status(400).json({message:"Transaction Details not found!"})
         }
      }else{
         if(obj && obj?.clientTxnId){
            const getTransactionDetails = await Tranaction.findByIdAndUpdate(obj?.clientTxnId,{
               $set:{
                  paidAmount:obj?.paidAmount,
                  paymentMode:obj?.paymentMode,
                  status:obj?.status,
                  statusCode:obj?.statusCode,
                  bankErrorCode:obj?.bankErrorCode,
                  sabPaisaTxnId:obj?.sabpaisaTxnId,
                  sabPaisaMessage:obj?.sabPaisaMessage,
                  transDate:obj?.transDate,
                  bankName:obj?.bankName,
                  info:obj
               }
         })
         }
      return res?.status(400).json({message:"Invaild/ failed Transaction"})
   }
    }
   } catch (error) {
      console.log("paymentConfirmation in error:", error);
      return res?.status?.json({message:"Oops,Transaction failed"})
   }
}

export const paymentWebHook = async (req, res) => {
   const redirectUrl = process?.env?.RedirectUrl
    try {
      if(req.body?.clientCode!=process?.env?.CLIENTCODE || !req.body?.encResponse){
         return res?.render("paymentFailed",{message:"Invalid clientCode",redirectUrl})
      }else{
         console.log("calling paymentWebhook");
         return res?.render("paymentConfirmation",{message:"Payment",redirectUrl,encResponse:req.body?.encResponse,apiBase:process.env.apibase})
      }

      const decryptData = decrypt(req.body?.encResponse)

      if(!decryptData){
         return res?.render("paymentFailed",{message:"Invaild Transaction",redirectUrl})

      }else{
         const dataArr = decryptData?.split("&")
         const obj = {};
         
         dataArr?.forEach(item => {
           const [key, value] = item.split('=');
           obj[key] = value;
         });

         if(obj && obj?.statusCode=='0000' && obj?.status=='SUCCESS' && obj?.clientTxnId){
            const getTransaction = await Tranaction.findById(obj?.clientTxnId)
            if(getTransaction){
               const getBill = await Bill.findByIdAndUpdate(getTransaction?.invoiceId,{
                  $set:{
                     isPaid:true,
                     transactionId:obj?.clientTxnId
                  }
               },{new:true})
               if(getBill){
                  const getTransactionDetails = await Tranaction.findByIdAndUpdate(obj?.clientTxnId,{
                     $set:{
                        isPaid:true,
                        paidAmount:obj?.paidAmount,
                       paymentMode:obj?.paymentMode,
                       status:obj?.status,
                       statusCode:obj?.statusCode,
                       sabPaisaTxnId:obj?.sabpaisaTxnId,
                       sabPaisaMessage:obj?.sabPaisaMessage,
                       transDate:obj?.transDate,
                       bankName:obj?.bankName,
                       info:obj
                     }
                  },{new:true})
                  return res?.render("paymentSuccess",{message:"Successfully bill paid",redirectUrl})
               }else{
                  return res?.render("paymentFailed",{message:"Transaction bill not found",redirectUrl})
               }
            }else{
               return res?.render("paymentFailed",{message:"Transaction Details not found!",redirectUrl})
         }
      }else{
         if(obj && obj?.clientTxnId){
            const getTransactionDetails = await Tranaction.findByIdAndUpdate(obj?.clientTxnId,{
               $set:{
                  paidAmount:obj?.paidAmount,
                  paymentMode:obj?.paymentMode,
                  status:obj?.status,
                  statusCode:obj?.statusCode,
                  bankErrorCode:obj?.bankErrorCode,
                  sabPaisaTxnId:obj?.sabpaisaTxnId,
                  sabPaisaMessage:obj?.sabPaisaMessage,
                  transDate:obj?.transDate,
                  bankName:obj?.bankName,
                  info:obj
               }
         })
         }
      return res?.render("paymentFailed",{message:"Invaild/ failed Transaction",redirectUrl})
   }
    }
   
   }catch (error) {
       console.log("paymentWebHook in error:", error);
       return res?.render("paymentFailed",{message:"Oops,Transaction failed",redirectUrl})
 
    }
 }
