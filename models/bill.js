import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const billSchema = new mongoose.Schema({
    invoiceNo:{type:String,require:true},
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
    subAmt: {type:Number,require:true},
    gstAmt:{type:Number,require:true},
    totalAmt:{type:Number,require:true},
    invoiceDate:{type:String,require:true},
},{timestamps:true});


const Bill = mongoose.model("Bill", billSchema);

export default Bill;
