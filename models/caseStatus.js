import mongoose from "mongoose";

const caseStatusSchema = new mongoose.Schema({
    status:{type:String,default:"pending"},
    remark:{type:String,default:"pending stage."},
    consultant:{type:String,default:""},
    isMarge:{type:Boolean,default:false},
    caseId:{
        type:mongoose.Schema.ObjectId,
        ref:"Case"
    },
    caseMargeId:{ type:String,default:""},
    clientId:{
        type:mongoose.Schema.ObjectId,
        ref:"Client"
    },
    partnerId:{
        type:mongoose.Schema.ObjectId,
        ref:"Partner"
    },
    employeeId:{
        type:mongoose.Schema.ObjectId,
        ref:"Employee"
    },
    adminId:{
        type:mongoose.Schema.ObjectId,
        ref:"Admin"
    },
    date:{type:Date,default:new Date()},
    isActive:{type:Boolean,default:true,required:true},
    
},{timestamps:true});


const CaseStatus = mongoose.model("CaseStatus", caseStatusSchema);

export default CaseStatus;
