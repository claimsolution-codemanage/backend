import mongoose from "mongoose";

const employeePermissionSchema = new mongoose.Schema({
    empId: { type: mongoose.Schema.ObjectId, ref: "Employee" },
    permissions: { type: Array, default: [] },
    isActive: { type: Boolean, default: true, required: "true" }
}, { timestamps: true });


const EmployeePermission = mongoose.model("employee_permissions", employeePermissionSchema);

export default EmployeePermission;