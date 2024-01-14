import express from 'express';
const router = express.Router();
import {clientSignUp,clientsignIn,verifyClientEmailOtp,updateClientProfile,getClientProfile,
    addNewClientCase,viewClientCaseById,viewClientAllCase,clientForgetPassword,clientResetPassword,
    clientMobileNoVerify,clientSendMobileOtpCode,clientAuthenticate,clientAddCaseFile,clientTls,
    acceptClientTerms_Conditions,clientDashboard
} from '../controller/client.js';


router.post("/signin", clientsignIn)
router.post("/signup", clientSignUp)
router.get("/authenticate",clientAuthenticate)
router.post("/verifyEmail",verifyClientEmailOtp)
router.post("/sendMobileOtpCode",clientSendMobileOtpCode)
router.post("/clientMobileNoVerify",clientMobileNoVerify)
router.get("/getClientProfile", getClientProfile)
router.post("/updateClientProfile", updateClientProfile)
router.post("/addNewClientCase",addNewClientCase)
router.post("/addCaseFile",clientAddCaseFile)
router.get("/viewClientCaseById",viewClientCaseById)
router.get("/viewClientAllCase",viewClientAllCase)
router.put("/clientForgetPassword",clientForgetPassword)
router.put("/clientResetPassword",clientResetPassword)
router.get("/getTls",clientTls)
router.put("/acceptClientTerms_Conditions",acceptClientTerms_Conditions)
router.get("/getClientDashboardData",clientDashboard)


export default router