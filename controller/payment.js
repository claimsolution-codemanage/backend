import Tranaction from "../models/transaction.js";
import Bill from "../models/bill.js";
import { validMongooseId } from "../utils/helper.js";
import crypto from 'crypto'

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
      "&clientTxnId="+isValidTransaction._id+"&amount="+isValidTransaction?.invoiceId?.totalAmt+"&clientCode="+
      process?.env?.CLIENTCODE.trim()+"&transUserName="+process?.env?.TRANSUSERNAME.trim()+"&transUserPassword="+
      process?.env?.TRANSUSERPASSWORD.trim()+"&callbackUrl="+process?.env?.CALLBACKURL.trim()+"&amountType="+
      process?.env?.TRANSUSERNAME.trim()+"&mcc="+process?.env?.MCC.trim()+"&channelId="+"W".trim()+"&transDate="+new Date().getTime()


      const algorithm = 'aes-192-cbc';
      console.log(process.env.AUTHKEY,process.env.AUTHIV);
      const cipher = crypto.createCipheriv(algorithm, process.env.AUTHKEY,process.env.AUTHIV);
      let encrypted = cipher.update(paymentStr, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const encData = encrypted

      return res.render("pgCheckout",{encData,clientCode:process?.env?.CLIENTCODE.trim()})

   } catch (error) {
      console.log("paymentCheckoutPage in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const paymentWebHook = async (req, res) => {
    try {
        console.log("paymentWebHook",req);
       return res.status(200).json({ success: true, message: "payment"});
    } catch (error) {
       console.log("paymentWebHook in error:", error);
       res.status(500).json({ success: false, message: "Internal server error", error: error });
 
    }
 }