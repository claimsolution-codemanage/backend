import { getCaseFormDetailsById } from "../../utils/dbHelperFunc/case/form.js";
import Partner from "../../models/partner.js"
import { authPartner } from "../../middleware/authentication.js";

export const partnerGetCaseFormById = async (req, res, next) => {
    try {
        const verify = await authPartner(req, res, next)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const partner = await Partner.findById(req?.user?._id);
        if (!partner) return res.status(401).json({ success: false, message: "Not register with us" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
        await getCaseFormDetailsById(req, res, next)
    } catch (error) {
        console.log("partnerGetCaseFormById in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}
