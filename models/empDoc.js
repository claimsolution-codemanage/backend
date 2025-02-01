import mongoose from "mongoose";

const empDocSchema = new mongoose.Schema({
    name:{type:String,default:""},
    type:{type:String,default:""},
    format:{type:String,default:""},
    url:{type:String,default:""},
    employeeId:{
        type:mongoose.Schema.ObjectId,
        ref:"Employee"
    },
    date:{type:Date,default:new Date()},
    isPrivate:{type:Boolean,default:false},
    isActive:{type:Boolean,default:true},

},{timestamps:true});


const EmpDoc = mongoose.model("EmpDoc", empDocSchema);

export default EmpDoc;
