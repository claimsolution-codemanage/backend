import mongoose from "mongoose";

const statementSchema = new mongoose.Schema({
   empId:{type:mongoose.Schema.ObjectId,ref:"Employee"},
   partnerId:{type:mongoose.Schema.ObjectId,ref:"Partner"},
   caseLogin:{type:Number},
   policyHolder:{type:String,default:""},
   fileNo:{type:String},
   policyNo:{type:String},
   insuranceCompanyName:{type:String},
   claimAmount:{type:Number},
   approvedAmt:{type:Number},
   constultancyFee:{type:Number},
   TDS:{type:String},
   modeOfLogin:{type:String},
   payableAmt:{type:Number},
   utrDetails:{type:String},
   fileUrl:{type:String},
   isActive:{type:Boolean,default:true},
   remark: {type:String}, 
   isPaid:{type:Boolean}, 
   paidBy: {type:String}, 
   paidDate: {type:Date},
   branchId:{type:String,default:"", }
},{timestamps:true});



const Statement = mongoose.model("Statement", statementSchema);

export default Statement;
