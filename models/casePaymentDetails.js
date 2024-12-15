import mongoose from "mongoose";

const casePaymentSchema = new mongoose.Schema({
    caseId:{
        type:mongoose.Schema.ObjectId,
        ref:"Case"
    },
    paymentMode:{
        type:String,
    },
    dateOfPayment:{
        type:Date,
    },
    utrNumber:{
        type:String,
    },
    bankName:{
        type:String,
    },
    chequeNumber:{
        type:String,
    },
    chequeDate:{
        type:Date,
    },
    amount:{
        type:Number,
    },
    transactionDate:{
        type:Date,
    },
    isActive:{type:Boolean,default:true},
},{timestamps:true});


const CasePaymentDetails = mongoose.model("CasePaymentDetails", casePaymentSchema);

export default CasePaymentDetails;
