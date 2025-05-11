import mongoose from "mongoose";

const shareSectionSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.ObjectId,
        ref: "Client",
    },
    partnerId: {
        type: mongoose.Schema.ObjectId,
        ref: "Partner",
    },
    caseId: {
        type: mongoose.Schema.ObjectId,
        ref: "Case",
    },
    toEmployeeId: {
        type: mongoose.Schema.ObjectId,
        ref: "Employee",
    },
    isActive:{type:Boolean,default:false},
    branchId: { type: String, default: "" }
}, { timestamps: true });

const ShareSection = mongoose.model("ShareSection", shareSectionSchema);

export default ShareSection;
