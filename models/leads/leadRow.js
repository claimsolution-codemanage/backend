import mongoose from "mongoose";

const leadRowSchema = new mongoose.Schema({
  data: {  type: mongoose.Schema.Types.Mixed,
  default: {}, },
  assignedTo: {type: mongoose.Schema.Types.ObjectId,ref: "Employee"},
  followUpDate: {type: Date},
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  branchId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, },
  createdByModel: {type: String, required: true,enum: ["Admin", "Employee"],},
  updatedBy: { type: mongoose.Schema.Types.ObjectId, },
  updatedByModel: {type: String,enum: ["Admin", "Employee"],},

}, { timestamps: true });

const LeadRows = mongoose.model("lead_rows", leadRowSchema);
export default LeadRows