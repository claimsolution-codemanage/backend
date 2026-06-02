import express from 'express';
const router = express.Router();
import {
    verifyClientEmailOtp, updateClientProfile, getClientProfile,
    addNewClientCase, viewClientCaseById, viewClientAllCase, clientForgetPassword, clientResetPassword,
    clientAuthenticate, clientAddCaseFile, clientTls,
    acceptClientTerms_Conditions, clientDashboard, clientUpdateCaseById, clientResendOtp, clientViewAllInvoice, clientViewInvoiceById,
    clientPayInvoiceById, clientUploadImage, clientUploadAttachment, signUpWithRequest
} from '../controller/client.js';

import * as clientContoller from "../controller/client.js"

import caseFormRoutes from "../routes/caseForm/clientCaseFormRoutes.js"
import clientCasePaymentRoutes from "../routes/casePayment/clientCasePaymentRoutes.js"
import { authClientNext } from '../middleware/authentication.js';


router.post("/signin", clientContoller.clientSignIn)
router.post("/signup", clientContoller.clientSignUp)
router.get("/authenticate", clientAuthenticate)

// email otp
router.post("/send-email-otp",authClientNext, clientContoller.sendClientEmailOtp)
router.post("/verifyEmail",authClientNext, clientContoller.verifyClientEmailOtp)

router.post("/clientMobileNoVerify", clientContoller.verifyClientMobileOtp)
router.post("/clientResendOtp", clientContoller.clientResendOtp)

router.put("/clientForgetPassword", clientContoller.clientForgetPassword)
router.put("/clientResetPassword", clientContoller.clientResetPassword)

// signup with request
router.post("/acceptRequest", clientContoller.signUpWithRequest)

// profile
router.get("/getClientProfile", getClientProfile)
router.post("/updateClientProfile", updateClientProfile)

// case
router.post("/addNewClientCase",authClientNext, clientContoller.addNewClientCase)
router.post("/addCaseFile", clientAddCaseFile)
router.post("/updateCaseById", clientUpdateCaseById)
router.get("/viewClientCaseById", viewClientCaseById)
router.get("/viewClientAllCase", viewClientAllCase)


router.get("/getTls", clientTls)
router.put("/acceptClientTerms_Conditions", acceptClientTerms_Conditions)
router.get("/getClientDashboardData", clientDashboard)

// invoice
router.get("/getClientViewAllInvoice", clientViewAllInvoice)
router.get("/getClientViewInvoiceById", clientViewInvoiceById)
router.post("/clientPayInvoiceById", clientPayInvoiceById)

router.post("/upload/image", clientUploadImage)
router.post("/upload/attachment", clientUploadAttachment)

router.use("/caseForm", caseFormRoutes)
router.use("/case_payment", clientCasePaymentRoutes)




export default router