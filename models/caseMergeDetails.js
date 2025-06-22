import mongoose from "mongoose";

const caseMergeDetails = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.ObjectId,
        ref: "Client",
    },
    partnerId: {
        type: mongoose.Schema.ObjectId,
        ref: "Partner",
    },
    mergeCaseId: {
        type: mongoose.Schema.ObjectId,   // merge to case Id
        ref: "Case",
    },
    caseId: {
        type: mongoose.Schema.ObjectId,   // merge with case Id
        ref: "Case",
    },
    empId: {
        type: mongoose.Schema.ObjectId,
        ref: "Employee",
    },
    byEmpId: {
        type: mongoose.Schema.ObjectId,
        ref: "Employee",
    },
    byAdminId: {
        type: mongoose.Schema.ObjectId,
        ref: "Admin",
    },
    isActive:{type:Boolean,default:true},
}, { timestamps: true });

const CaseMergeDetails = mongoose.model("CaseMergeDetails", caseMergeDetails);

export default CaseMergeDetails;
