import express from 'express';
const router = express.Router();
import {clientSignUp,clientsignIn,verifyClientEmailOtp,updateClientProfile,getClientProfile,
    addNewClientCase,viewClientCaseById,viewClientAllCase,clientForgetPassword,clientResetPassword,
    clientMobileNoVerify,clientSendMobileOtpCode,clientAuthenticate,clientAddCaseFile,clientTls,
    acceptClientTerms_Conditions,clientDashboard,clientUpdateCaseById,clientResendOtp,clientViewAllInvoice,clientViewInvoiceById,
    clientPayInvoiceById,clientUploadImage,clientUploadAttachment,signUpWithRequest
} from '../controller/client.js';

import caseFormRoutes from "../routes/caseForm/clientCaseFormRoutes.js"


router.post("/signin", clientsignIn)
router.post("/signup", clientSignUp)
router.get("/authenticate",clientAuthenticate)
router.post("/verifyEmail",verifyClientEmailOtp)
router.post("/acceptRequest",signUpWithRequest)
router.post("/sendMobileOtpCode",clientSendMobileOtpCode)
router.post("/clientMobileNoVerify",clientMobileNoVerify)
router.get("/getClientProfile", getClientProfile)
router.post("/updateClientProfile", updateClientProfile)
router.post("/addNewClientCase",addNewClientCase)
router.post("/addCaseFile",clientAddCaseFile)
router.post("/updateCaseById",clientUpdateCaseById)
router.get("/viewClientCaseById",viewClientCaseById)
router.get("/viewClientAllCase",viewClientAllCase)
router.put("/clientForgetPassword",clientForgetPassword)
router.put("/clientResetPassword",clientResetPassword)
router.get("/getTls",clientTls)
router.put("/acceptClientTerms_Conditions",acceptClientTerms_Conditions)
router.post("/clientResendOtp",clientResendOtp)
router.get("/getClientDashboardData",clientDashboard)
router.get("/getClientViewAllInvoice",clientViewAllInvoice)
router.get("/getClientViewInvoiceById",clientViewInvoiceById)
router.post("/clientPayInvoiceById",clientPayInvoiceById)
router.post("/upload/image",clientUploadImage)
router.post("/upload/attachment",clientUploadAttachment)

router.use("/caseForm",caseFormRoutes)



export default router