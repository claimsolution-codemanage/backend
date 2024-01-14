import express from 'express';
const router = express.Router();
// import { signUp,verifyEmailOtp,setNewPassword,signIn,getProfileDetails,updateInfoDetails } from '../controller/partner.js';
import { signUp,verifyEmailOtp,signIn,partnerForgetPassword,partnerResetPassword,partnerSendMobileOtpCode,partnerMobileNoVerify,
    getProfileDetails,updateProfileDetails,getBankingDetails,updateBankingDetails,
    addNewCase,viewAllPartnerCase,partnerViewCaseById,partnerAuthenticate,partnerAddCaseFile,partnerTls,
    acceptPartnerTerms_Conditions,getpartnerDashboard

} from '../controller/partner.js';



router.post("/signUp",signUp)
router.post("/verifyEmail",verifyEmailOtp)
router.post("/authenticate",partnerAuthenticate)
router.post("/signIn",signIn)
router.put("/forgetPassword",partnerForgetPassword)
router.put("/resetPassword",partnerResetPassword)
router.post("/sendMobileOtpCode",partnerSendMobileOtpCode)
router.post("/mobileNoVerify",partnerMobileNoVerify)


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
router.get("/getTls",partnerTls)
router.get("/getpartnerDashboard",getpartnerDashboard)
router.put("/acceptPartnerTerms_Conditions",acceptPartnerTerms_Conditions)






// router.put("/updateInfoDetails",updateInfoDetails)

export default router


