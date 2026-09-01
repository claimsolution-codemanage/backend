import mongoose from "mongoose";

const leadRowSchema = new mongoose.Schema({
  leadId: { type: String, required: true, unique: true },
  name: { type: String, required: true, },
  mobileNo: { type: String, required: true },
  alternativeNo: { type: String },
  email: { type: String },
  city: { type: String },
  state: { type: String },
  insuranceCompany: { type: String },
  policyType: { type: String },
  claimAmount: { type: String },
  claimStatus: { type: String },
  leadSource: { type: String },
  leadStatus: { type: String, default: 'New' },
  status: { type: String, default: "Active" },
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

leadRowSchema.pre("save", async function (next) {
  if (!this.leadId) {
    const lastLead = await LeadRows.findOne().sort({ createdAt: -1 });

    const lastLeadId = lastLead
      ? parseInt(lastLead.leadId.split("-")[1])
      : 0;

    this.leadId = `CMSOL-${lastLeadId + 1}`;
  }

  next();
});

const LeadRows = mongoose.model("lead_rows", leadRowSchema);

export default LeadRows