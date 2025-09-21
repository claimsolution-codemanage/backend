import mongoose from "mongoose";

const FORM_TYPE = ["gro","ombudsman","irdai_stage","reimbursment_claim_filing",]
const METHOD_TYPE = ['online', 'offline']


const caseFormSchema = new mongoose.Schema({
    caseId: { type: mongoose.Schema.ObjectId, ref: "Case" },
    clientId: { type: mongoose.Schema.ObjectId, ref: "Client" },
    paymentDetailsId: { type: mongoose.Schema.ObjectId, ref: "CasePaymentDetails" },
    statementId: { type: mongoose.Schema.ObjectId, ref: "Statement" },
    billId: { type: mongoose.Schema.ObjectId, ref: "Bill" },
    specialCase: { type: Boolean, default: false },
    partnerFee: { type: Number },
    consultantFee: { type: Number },
    filingDate: { type: Date, default: new Date() },
    isSettelment: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    approvedAmount: { type: Number },
    approvalDate: { type: Date },
    approvalLetterPrivate: { type: Boolean, default: false },
    approvalLetter: { type: String },
    formType: { type: String,enum:FORM_TYPE, default: "" },
    method: {type: String,enum:METHOD_TYPE, default: 'online'},
    complaintNumber: { type: String },
    branchId: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });


const CaseFrom = mongoose.model("case_forms", caseFormSchema);

export default CaseFrom;
