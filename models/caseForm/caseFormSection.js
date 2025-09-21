import mongoose from "mongoose";
const SECTION_TYPE = ["status","query","query_reply","hearing_schedule","award_part","track_stages","attachment_part"]

const formSectionSchema = new mongoose.Schema({
    caseFormId: { type: mongoose.Schema.ObjectId, ref: "case_forms", index: true },
    status: { type: String, default: "" },
    remarks: { type: String, default: "" },
    date: { type: Date, default: new Date() },
    isPrivate: { type: Boolean, default: false },
    deliveredBy:{type:String},
    awardType:{type:String},
    type: { type: String,enum:SECTION_TYPE, default: "" },
    isActive: { type: Boolean, default: true },
},{ timestamps: true })

const CaseFormSection = mongoose.model("case_form_sections", formSectionSchema);

export default CaseFormSection;