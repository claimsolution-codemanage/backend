import Transaction from "../models/transaction.js";
import Bill from "../models/bill.js";
import { validMongooseId } from "../utils/helper.js";
import crypto from 'crypto'

const algo = 'aes-128-cbc';
const key = Buffer.from(process.env.AUTHKEY, 'utf-8');
const iv = Buffer.from(process.env.AUTHIV, 'utf-8');

export const encrypt=(data)=> {
   const cipher = crypto.createCipheriv(algo,key,iv);
   let encrypted = cipher.update(data, 'utf-8', 'base64');
   encrypted += cipher.final('base64');
   return encrypted
}

export const decrypt =(encryptedData)=>{
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
      const isValidTransaction = await Transaction.findById(transactionId).populate("clientId").populate("invoiceId")
      if(!isValidTransaction){
        return res.render("paymentError",{error:"Tranasaction id is invalid/expired"})
      }

      if(isValidTransaction?.isTranactionCall){
         return res.render("paymentError",{error:"Tranasaction id is invalid/expired"})
      }

      const updateIsTransactionCall = await Transaction.findByIdAndUpdate(transactionId,{$set:{isTranactionCall:true}})

      const paymentStr = "payerName="+isValidTransaction.clientId?.profile?.consultantName.trim()+
      "&payerEmail="+isValidTransaction.clientId?.profile?.primaryEmail.trim()+"&payerMobile="+
      isValidTransaction.clientId?.profile?.primaryMobileNo.trim()+
      "&clientTxnId="+transactionId?.trim()+"&amount="+isValidTransaction?.invoiceId?.totalAmt+"&clientCode="+
      process?.env?.CLIENTCODE.trim()+"&transUserName="+process?.env?.TRANSUSERNAME.trim()+"&transUserPassword="+
      process?.env?.TRANSUSERPASSWORD.trim()+"&callbackUrl="+process?.env?.CALLBACKURL.trim()+"&amountType="+
      "INR"+"&mcc="+process?.env?.MCC.trim()+"&channelId="+"W".trim()+"&transDate="+new Date().getTime()



      // console.log("paymentStr",paymentStr);
      const encData = encrypt(paymentStr?.trim())

      // console.log({encData:encData,clientCode:process?.env?.CLIENTCODE.trim()});
      return res.render("pgCheckout",{encData:encData,clientCode:process?.env?.CLIENTCODE.trim(),checkoutUrl:process.env.CHECKOUT_URL})

   } catch (error) {
      console.log("paymentCheckoutPage in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const paymentWebHook = async (req, res) => {
   const redirectUrl = process?.env?.RedirectUrl
   // console.log("body",req.body.clientCode,req.body?.encResponse);
    try {
      if(req.body?.clientCode!=process?.env?.CLIENTCODE || !req.body?.encResponse){
         return res?.render("paymentFailed",{message:"Invalid clientCode",redirectUrl})
      }

      const decryptData = decrypt(req.body?.encResponse)

      console.log("decrypt response",req.body.encResponse,decryptData)

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
            const getTransaction = await Transaction.findById(obj?.clientTxnId)
            if(getTransaction){
               const getBill = await Bill.findByIdAndUpdate(getTransaction?.invoiceId,{
                  $set:{
                     isPaid:true,
                     transactionId:obj?.clientTxnId
                  }
               },{new:true})
               if(getBill){
                  const getTransactionDetails = await Transaction.findByIdAndUpdate(obj?.clientTxnId,{
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
                 return  res.redirect("https://www.panel.claimsolution.in/client/all-invoices")
                  // return res?.render("paymentSuccess",{message:"Successfully bill paid",redirectUrl})
               }else{
                  return res?.render("paymentFailed",{message:"Transaction bill not found",redirectUrl})
               }
            }else{
               return res?.render("paymentFailed",{message:"Transaction Details not found!",redirectUrl})
         }
      }else{
         if(obj && obj?.clientTxnId){
            const getTransactionDetails = await Transaction.findByIdAndUpdate(obj?.clientTxnId,{
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
