import { CommanMassMailSender } from "../../utils/dbHelperFunc/mail/MassMailSender.js";


export const sendMassMail = async (req, res) => {
    try {
        await CommanMassMailSender(req, res);
    } catch (error) {
        console.error("sendMassMail error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
}
