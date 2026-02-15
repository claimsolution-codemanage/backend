import mongoose from "mongoose";

const leadColumnSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, 
  label: { type: String, required: true }, 
  type: {
    type: String,
    enum: ["text", "number", "date", "select"],
    default: "text",
  },
  options: [String],
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const LeadColumns = mongoose.model("lead_columns", leadColumnSchema);
export default LeadColumns