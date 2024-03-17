import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const transactionSchema = new mongoose.Schema({
    caseId:{
        type:mongoose.Schema.ObjectId,
        ref:"Case"
    },
    clientId:{
        type:mongoose.Schema.ObjectId,
        ref:"Client"
    },
    invoiceId:{
        type:mongoose.Schema.ObjectId,
        ref:"Bill"
    },
    isPaid:{
        type:Boolean,
        default:false
    },
    isTranactionCall:{
        type:Boolean,
        default:false
    },
    paidAmount:{
        type:Number,
    },
    paymentMode:{
        type:String,
    },
    status:{
        type:String,
    },
    statusCode:{
        type:Number,
    },
    bankErrorCode:{
        type:String
    },
    sabPaisaTxnId:{
        type:String,
    },
    sabPaisaMessage:{
        type:String,
    },
    transDate:{
        type:String,
    },
    bankName:{
        type:String,
    },
    info:{
        type:{}
    }

},{timestamps:true});


const Tranaction = mongoose.model("tranaction", transactionSchema);

export default Tranaction;
