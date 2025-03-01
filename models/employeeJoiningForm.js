import mongoose from "mongoose";

const employeeJoiningFormSchema = new mongoose.Schema({
    empId: {
        type: mongoose.Schema.ObjectId,
        ref: "Employee"},
    name: { type: String, },
    fatherName: { type: String },
    correspondenceAddress: { type: String },
    permanentAddress: { type: String },
    telephone: { type: String },
    mobile: { type: String, },
    email: { type: String, },
    dateOfBirth: { type: Date },
    maritalStatus: { type: String },
    panCardNo: { type: String },
    bloodGroup: { type: String },
    emergencyContact: {
        name: { type: String },
        relation: { type: String },
        contactNo: { type: String }
    },
    educationalDetails: [
        {
            degree: { type: String },
            university: { type: String },
            from: { type: String },
            to: { type: String },
            percentage: { type: String },
            specialization: { type: String }
        }
    ],
    employmentDetails: [
        {
            organization: { type: String },
            designation: { type: String },
            from: { type: String },
            to: { type: String },
            annualCTC: { type: String }
        }
    ],
    familyDetails: [
        {
            name: { type: String },
            relation: { type: String },
            occupation: { type: String },
            dateOfBirth: { type: String }
        }
    ],
    professionalReferences: [
        {
            name: { type: String },
            organization: { type: String },
            designation: { type: String },
            contactNo: { type: String }
        }
    ],
    signature: { type: String },
    place: { type: String },
    date: { type: Date, default: new Date() },
    isActive:{type:Boolean,default:true},
},{timestamps:true});


const EmployeeJoiningForm = mongoose.model("EmployeeJoiningForm", employeeJoiningFormSchema);
export default EmployeeJoiningForm;
