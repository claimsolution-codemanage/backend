import express from 'express';
const router = express.Router();
import { partnerForgetPassword,partnerResetPassword,
    getProfileDetails,updateProfileDetails,getBankingDetails,updateBankingDetails,
    addNewCase,viewAllPartnerCase,partnerViewCaseById,partnerAuthenticate,partnerAddCaseFile,partnerTls,
    acceptPartnerTerms_Conditions,getpartnerDashboard,partnerUpdateCaseById,
    signUpWithRequest,partnerUploadImage,partnerUploadAttachment,partnerDownloadReport,getStatement

} from '../controller/partner.js';

import * as partnerController from "../controller/partner.js"

import caseFormRoutes from "../routes/caseForm/partnerCaseFormRoutes.js"


router.post("/signUp",partnerController.signUp)
router.post("/mobileNoVerify",partnerController.verifyMobileOtp)
router.post("/resendOtp",partnerController.partnerResendMobileOtp)

router.post("/send-email-otp", partnerController.sendPartnerEmailOtp)
router.post("/verifyEmail",partnerController.verifyParnerEmailOtp)

router.post("/authenticate",partnerAuthenticate)
router.post("/signIn",partnerController.signIn)
router.put("/forgetPassword",partnerController.partnerForgetPassword)
router.put("/resetPassword",partnerController.partnerResetPassword)
router.post("/acceptRequest",partnerController.signUpWithRequest)


// router.post("/setForgetPassword",setForgetPassword)

router.get("/getProfileDetails",getProfileDetails)
router.put("/updateProfileDetails",updateProfileDetails)
router.get("/getBankingDetails",getBankingDetails)
router.put("/updateBankingDetails",updateBankingDetails)


router.post("/addNewCase",addNewCase)
// router.get("/viewAllCase",viewAllCase)
router.get("/viewAllPartnerCase",viewAllPartnerCase)
router.get("/partnerViewCaseById",partnerViewCaseById)
router.post("/addCaseFile",partnerAddCaseFile)
router.post("/updateCaseById",partnerUpdateCaseById)
router.get("/getTls",partnerTls)
router.get("/getpartnerDashboard",getpartnerDashboard)
router.put("/acceptPartnerTerms_Conditions",acceptPartnerTerms_Conditions)

// for upload
router.post("/upload/image",partnerUploadImage)
router.post("/upload/attachment",partnerUploadAttachment)


router.get("/downloadReport",partnerDownloadReport)


// for statement
router.get("/getStatement",getStatement)

router.use("/caseForm",caseFormRoutes)







// router.put("/updateInfoDetails",updateInfoDetails)

export default router


