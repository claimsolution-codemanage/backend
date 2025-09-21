import mongoose from "mongoose";

const caseFormAttachmentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    fileName: { type: String },
    fileType: { type: String },
    caseFormId: { type: mongoose.Schema.ObjectId, ref: "case_forms", index: true },
    caseFormSectionId: { type: mongoose.Schema.ObjectId, ref: "case_form_sections", index: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const caseFormAttachment = mongoose.model("case_form_attachements", caseFormAttachmentSchema);

export default caseFormAttachment;