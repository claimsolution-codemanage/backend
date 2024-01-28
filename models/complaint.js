import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    mobileNo: {
        type: String,
        required: true,
    },
    claim_type: {
        type: String,
        default: ""
    },
    complaint_type: {
        type: String,
        default: ""
    },
    complaint_brief: {
        type: String,
        default: ""
    },
    complaintProcessSteps:{type:[{
        date:{type:Date,default:Date.now()},
        status:{type:String,default:"pending"},
        remark:{type:String,default:"pending stage."},
        consultant:{type:String,default:""},
     }]},
    complaintCommit:{type:[{
        _id:{type:String},
        name:{type:String},
        role:{type:String},
        type:{type:String},
        commit:{type:String},
        Date:{type:Date}
     }]}

}, { timestamps: true });


const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;






