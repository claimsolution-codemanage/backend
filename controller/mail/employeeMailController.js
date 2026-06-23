import EmployeePermission from "../../models/employee/employeePermissionModel.js";
import { CommanMassMailSender } from "../../utils/dbHelperFunc/mail/MassMailSender.js";


export const sendMassMail = async (req, res) => {
    try {
        const { employee } = req
        const permission = await EmployeePermission.findOne({ empId: employee?._id, permissions: { $in: ["send_emails"] } })
        if (!permission) {
            return res.status(403).json({ success: false, message: "You do not have permission to send mail" });
        }
        await CommanMassMailSender(req, res);
    } catch (error) {
        console.error("sendMassMail error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
}
