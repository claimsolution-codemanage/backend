import mongoose from "mongoose";

const caseSchema = new mongoose.Schema({
   partnerObjId: {
      type: mongoose.Schema.ObjectId,
      ref: "Partner"
   },
   clientObjId: {
      type: mongoose.Schema.ObjectId,
      ref: "Client"
   },
   empObjId: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee"
   },
   caseFrom: { type: String, required: "true" },
   acceptPayment: { type: Boolean, default: false, required: "true" },
   pendingPayment: { type: Boolean, default: false, required: "true" },
   isPartnerReferenceCase: {
      type: Boolean, default: false
   },
   partnerReferenceCaseDetails: {
      type: Object, default: {}
   },
   isEmpSaleReferenceCase: {
      type: Boolean, default: false
   },
   empSaleReferenceCaseDetails: {
      type: Object, default: {}
   },
   name: { type: String, required: "true" },
   fatherName: { type: String },
   email: { type: String },
   mobileNo: { type: String, required: "true" },
   policyType: { type: String },
   insuranceCompanyName: { type: String },
   complaintType: { type: String },
   policyNo: { type: String },
   address: { type: String },
   DOB: { type: Date },
   pinCode: { type: String },
   claimAmount: { type: Number, required: "true" },
   city: { type: String },
   state: { type: String },
   problemStatement: { type: String },
   isActive: { type: Boolean, required: true, default: true },
   fileNo: { type: String, required: true },
   currentStatus: { type: String, required: true, default: "Pending" },
   addEmployee: { type: Array, default: [] },
   branchId: { type: String, default: "", },
   nextFollowUp: { type: Date, default: null },
   lastStatusDate: { type: Date, default: Date.now() },

}, { timestamps: true });

const Case = mongoose.model("Case", caseSchema);

export default Case;
