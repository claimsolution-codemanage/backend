import mongoose from "mongoose";

const ombudsmanStatusSchema = new mongoose.Schema({
    caseId: { type: mongoose.Schema.ObjectId, ref: "Case" },
    clientId: { type: mongoose.Schema.ObjectId, ref: "Client" },
    paymentDetailsId: { type: mongoose.Schema.ObjectId, ref: "CasePaymentDetails" },
    statementId: { type: mongoose.Schema.ObjectId, ref: "Statement" },
    billId: { type: mongoose.Schema.ObjectId, ref: "Bill" },
    specialCase: { type: Boolean, default: false },
    partnerFee: { type: Number },
    consultantFee: { type: Number },
    filingDate: { type: Date, default: new Date() },
    method: {
        type: String,
        enum: ['online', 'offline'],
        default: 'online'
    },
    complaintNumber: {
        type: String
    },
    statusUpdates: {
        type: [
            {
                status: { type: String, default: "" },
                remarks: { type: String, default: "" },
                date: { type: Date, default: new Date() },
                isPrivate: { type: Boolean, default: false },
                attachment: { type: String, default: "" },
            }
        ], default: []
    },
    queryHandling: {
        type: [
            {
                date: { type: Date, default: new Date() },
                remarks: { type: String, default: "" },
                isPrivate: { type: Boolean, default: false },
                attachment: { type: String, default: "" },
            }
        ], default: []
    },
    queryReply: {
        type: [
            {
                remarks: { type: String, default: "" },
                date: { type: Date, default: new Date() },
                byCourier: { type: Boolean, default: false },
                byMail: { type: Boolean, default: false },
                isPrivate: { type: Boolean, default: false },
                attachment: { type: String, default: "" },
            }
        ], default: []
    },
    hearingSchedule: {
        type: [
            {
                remarks: { type: String, default: "" },
                date: { type: Date, default: new Date() },
                isPrivate: { type: Boolean, default: false },
                attachment: { type: String, default: "" },
            }
        ], default: []
    },
    awardPart: {
        type: [
            {
                type: { type: String, enum:['award','reject'] },
                remarks: { type: String, default: "" },
                date: { type: Date, default: new Date() },
                isPrivate: { type: Boolean, default: false },
                attachment: { type: String, default: "" },
            }
        ], default: []
    },
    attachmentPart: {
        type:{
            isPrivate: { type: Boolean, default: false },
            attachment: { type: String, default: "" },
        }
    },
    isSettelment: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    approvedAmount: { type: Number },
    approvalDate: { type: Date },
    approvalLetterPrivate: { type: Boolean, default: false },
    approvalLetter: { type: String },
    branchId: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });


const CaseOmbudsmanStatus = mongoose.model("caseombudsmanstatus", ombudsmanStatusSchema);

export default CaseOmbudsmanStatus;
