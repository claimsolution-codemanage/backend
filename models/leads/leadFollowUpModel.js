import mongoose from "mongoose";

const leadFollowUpSchema = new mongoose.Schema({
    leadRowId: { type: mongoose.Schema.Types.ObjectId, ref: "lead_rows" },
    dateTime: { type: Date },
    mode: { type: String },
    summary: { type: String },
    nextFollowUpDate: { type: Date },
    isActive: { type: Boolean, default: true },
    branchId: { type: String },
}, { timestamps: true });

const LeadFollowUp = mongoose.model("lead_followup", leadFollowUpSchema);
export default LeadFollowUp