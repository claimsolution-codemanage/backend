import Tranaction from "../models/transaction.js";
import Bill from "../models/bill.js";
import { validMongooseId } from "../utils/helper.js";
import crypto from 'crypto'

const algo = 'aes-128-cbc';
const iv = process.env.AUTHIV;
const key = process.env.AUTHKEY;

function encrypt(data) {
   const cipher = crypto.createCipheriv(algo, Buffer.from(key), Buffer.from(iv));
   let encrypted = cipher.update(data, 'utf-8', 'base64');
   encrypted += cipher.final('base64');
   return encrypted
}

function decrypt(encryptedData){
   let decipher = crypto.createDecipheriv(algo, Buffer.from(key), Buffer.from(iv));
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
      "INR"+"&mcc="+process?.env?.MCC.trim()+"&channelId="+"W".trim()+"&transDate="+new Date().getTime()+
      "&successURL=http://localhost:5173"+"&failureURL=http://localhost:5173/fail"



      console.log("paymentStr",paymentStr,iv,key);
      const encData = encrypt(paymentStr?.trim())

      console.log({encData:encData,clientCode:process?.env?.CLIENTCODE.trim()});
      return res.render("pgCheckout",{encData:encData,clientCode:process?.env?.CLIENTCODE.trim()})

   } catch (error) {
      console.log("paymentCheckoutPage in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const paymentWebHook = async (req, res) => {
    try {
        console.log("paymentWebHook",req);
        console.log("payment body",req.body)
        console.log("payment response",req?.encResponse)
        console.log("payment body response",req.body?.encResponse)

       return res.status(200).json({ success: true, message: "payment"});
    } catch (error) {
       console.log("paymentWebHook in error:", error);
       res.status(500).json({ success: false, message: "Internal server error", error: error });
 
    }
 }