import mongoose from "mongoose";

const groStatusSchema = new mongoose.Schema({
    caseId:{type:mongoose.Schema.ObjectId, ref:"Case"},
    clientId:{ type:mongoose.Schema.ObjectId,ref:"Client"},
    paymentDetailsId:{ type:mongoose.Schema.ObjectId,ref:"CasePaymentDetails"},
    statementId:{ type:mongoose.Schema.ObjectId,ref:"Statement"},
    billId:{ type:mongoose.Schema.ObjectId,ref:"Bill"},
    specialCase:{type:Boolean,default:false},
    partnerFee:{  type:Number},
    consultantFee:{  type:Number},
    groFilingDate:{  type:Date,default:new Date() },
    groStatusUpdates:{type:[
        {
            status: {type:String,default:""},
            remarks: {type:String,default:""},
            date: {  type:Date,default:new Date() },
            isPrivate: {type:Boolean,default:false},
            attachment: {type:String,default:""},
        }
     ],default:[]},
    queryHandling:{type:[
        {
            date: {  type:Date,default:new Date() },
            remarks: {type:String,default:""},
            isPrivate: {type:Boolean,default:false},
            attachment: {type:String,default:""},
        }
    ],default:[]},
    queryReply:{type:[
        {
            remarks: {type:String,default:""},
            date: {  type:Date,default:new Date() },
            byCourier: {type:Boolean,default:false},
            byMail: {type:Boolean,default:false},
            isPrivate: {type:Boolean,default:false},
            attachment: {type:String,default:""},
        }
    ],default:[]},
    isSettelment:{  type:Boolean,default:false },
    approved:{  type:Boolean,default:false },
    approvedAmount:{  type:Number},
    approvalDate:{  type:Date },
    approvalLetterPrivate:{  type:Boolean,default:false },
    approvalLetter:{type:String},
    branchId:{ type:String, default:""},
    isActive:{type:Boolean,default:true},
},{timestamps:true});


const CasegroStatus = mongoose.model("casegrostatus", groStatusSchema);

export default CasegroStatus;
