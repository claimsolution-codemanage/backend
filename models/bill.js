import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const billSchema = new mongoose.Schema({
    invoiceNo:{type:String,require:true},
    caseId:{
        type:mongoose.Schema.ObjectId,
        ref:"Case"
    },
    clientId:{
        type:mongoose.Schema.ObjectId,
        ref:"Client"
    },
    isPaid:{
        type:Boolean,
        default:false
    },
    transactionId:{
        type:mongoose.Schema.ObjectId,
        ref:"transaction"
    },
    sender:{
    type:{},
    require:true
    },
    receiver:{
        type:{},
        require:true
    },
    invoiceItems:{
        type:[],
        require:true
    },
    isActive:{type:Boolean,default:true},
    subAmt: {type:Number,require:true},
    gstAmt:{type:Number,require:true},
    totalAmt:{type:Number,require:true},
    // invoiceDate:{type:String,require:true},
    billDate:{type:Number,default:new Date().getTime()},
    branchId:{ type:String, default:""},
},{timestamps:true});


const Bill = mongoose.model("Bill", billSchema);

export default Bill;
