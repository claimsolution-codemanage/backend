import express from 'express';
const router = express.Router();
import {
    getProfileDetails, updateProfileDetails, getBankingDetails, updateBankingDetails,
    partnerAuthenticate, partnerTls,
    acceptPartnerTerms_Conditions, getpartnerDashboard,
    partnerUploadImage, partnerUploadAttachment, partnerDownloadReport, getStatement

} from '../controller/partner.js';

import * as partnerController from "../controller/partner.js"

import caseFormRoutes from "../routes/caseForm/partnerCaseFormRoutes.js"
import partnerCaseRoutes from "../routes/case/partnerCaseRoutes.js"


router.post("/signUp", partnerController.signUp)
router.post("/mobileNoVerify", partnerController.verifyMobileOtp)
router.post("/resendOtp", partnerController.partnerResendMobileOtp)

router.post("/send-email-otp", partnerController.sendPartnerEmailOtp)
router.post("/verifyEmail", partnerController.verifyParnerEmailOtp)

router.post("/authenticate", partnerAuthenticate)
router.post("/signIn", partnerController.signIn)
router.put("/forgetPassword", partnerController.partnerForgetPassword)
router.put("/resetPassword", partnerController.partnerResetPassword)
router.post("/acceptRequest", partnerController.signUpWithRequest)


// router.post("/setForgetPassword",setForgetPassword)

router.get("/getProfileDetails", getProfileDetails)
router.put("/updateProfileDetails", updateProfileDetails)
router.get("/getBankingDetails", getBankingDetails)
router.put("/updateBankingDetails", updateBankingDetails)


router.get("/getTls", partnerTls)
router.get("/getpartnerDashboard", getpartnerDashboard)
router.put("/acceptPartnerTerms_Conditions", acceptPartnerTerms_Conditions)

// for upload
router.post("/upload/image", partnerUploadImage)
router.post("/upload/attachment", partnerUploadAttachment)


router.get("/downloadReport", partnerDownloadReport)


// for statement
router.get("/getStatement", getStatement)

router.use("/case", partnerCaseRoutes)
router.use("/caseForm", caseFormRoutes)



export default router


