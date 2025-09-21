import { getCaseFormDetailsById } from "../../utils/dbHelperFunc/case/form.js";
import Client from "../../models/client.js"
import { authClient } from "../../middleware/authentication.js";

export const clientGetCaseFormById = async (req, res, next) => {
    try {
        req.isClient = true
        const verify = await authClient(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
        const client = await Client.findById(req?.user?._id);
        if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
        if (!client?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })
        await getCaseFormDetailsById(req, res, next)
    } catch (error) {
        console.log("clientGetCaseFormById in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}
