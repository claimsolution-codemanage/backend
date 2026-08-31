import mongoose from "mongoose";

const leadRowSchema = new mongoose.Schema({
  leadId: { type: String, required: true, unique: true },
  name: { type: String, required: true, },
  mobile: { type: String, required: true },
  alternativeMobile: { type: String },
  email: { type: String },
  city: { type: String },
  state: { type: String },
  insuranceCompany: { type: String },
  policyType: { type: String },
  claimAmount: { type: String },
  claimStatus: { type: String },
  leadSource: { type: String },
  leadStatus: { type: String },
  followUpDate: { type: Date, default: null },
  branchId: { type: String },
  data: { type: mongoose.Schema.Types.Mixed, default: {}, },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, },
  createdByModel: { type: String, required: true, enum: ["Admin", "Employee"], },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, },
  updatedByModel: { type: String, enum: ["Admin", "Employee"], },

}, { timestamps: true });

const LeadRows = mongoose.model("lead_rows", leadRowSchema);
export default LeadRows