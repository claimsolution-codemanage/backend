import mongoose from "mongoose";

const caseDocSchema = new mongoose.Schema({
    name:{type:String,default:""},
    type:{type:String,default:""},
    format:{type:String,default:""},
    url:{type:String,default:""},
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
    isPrivate:{type:Boolean,default:false},
    isActive:{type:Boolean,default:true,required:true},

},{timestamps:true});


const CaseDoc = mongoose.model("CaseDoc", caseDocSchema);

export default CaseDoc;
