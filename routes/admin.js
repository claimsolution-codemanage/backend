import express from 'express';
const router = express.Router();
import { adminSignin,adminSignUp,createEmployeeAccount,adminResetPassword,adminSetIsActiveEmployee,changeStatusAdminCase,getSettingDetails,
viewAllAdminCase,viewCaseByIdByAdmin,viewAllPartnerByAdmin,viewPartnerByIdByAdmin,adminSetIsActivePartner,adminViewAllEmployee,
adminViewAllClient,adminViewClientById,adminSetIsActiveClient,adminSettingDetailsUpdate,adminAddCaseFeeClient,adminUpdateClientCaseFee,
uploadCompanyClientTls,uploadCompanyPartnerTls,adminShareCaseToEmployee,adminAddCaseComment,
adminAuthenticate,adminDashboard,adminUpdateCaseById,adminAddReferenceCaseAndMarge,adminDeleteCaseById,
adminDeletePartnerById,adminDeleteClientById,adminSetIsActiveCase,
adminEditCaseStatus,adminSetClientTag,adminSetPartnerTag,adminForgetPassword,adminResetForgetPassword,
getAllAdmin,superAdminSetIsActiveAdmin,superAdminDeleteAdminById,adminViewPartnerReport,
} from '../controller/admin.js';

import { adminAddJob,adminDeleteJob } from '../controller/job.js';
import { viewAllAdminComplaint,adminRemoveComplaintById } from '../controller/complaint.js';


router.post("/signin", adminSignin)
router.post("/signup", adminSignUp)
router.get("/authenticate",adminAuthenticate)
router.post("/resetPassword", adminResetPassword)
router.get("/getSettingDetails",getSettingDetails)
router.put("/forgetPassword",adminForgetPassword)
router.put("/resetForgetPassword",adminResetForgetPassword)
router.get("/superAdmin/allAdmin",getAllAdmin)
router.put("/superAdmin/setIsActiveAdmin",superAdminSetIsActiveAdmin)
router.delete("/superAdmin/deleteAdminById",superAdminDeleteAdminById)

router.put("/settingDetailsUpdate",adminSettingDetailsUpdate)
router.post("/createEmployeeAccount", createEmployeeAccount)
router.put("/setIsActiveEmployee",adminSetIsActiveEmployee)
router.get("/adminViewAllEmployee",adminViewAllEmployee)
router.put("/changeCaseStatus",changeStatusAdminCase)
router.get("/viewAllCase",viewAllAdminCase)
router.get("/viewCaseById",viewCaseByIdByAdmin)
router.post("/updateCaseById",adminUpdateCaseById)
router.put("/editCaseProcessById",adminEditCaseStatus)
router.put("/setClientTag",adminSetClientTag)
router.put("/setPartnerTag",adminSetPartnerTag)
router.get("/viewAllPartner",viewAllPartnerByAdmin)
router.get("/viewPartnerById",viewPartnerByIdByAdmin)
router.put("/changePartnerStatus",adminSetIsActivePartner)
router.get("/ViewAllClient",adminViewAllClient)
router.get("/ViewClientById",adminViewClientById)
router.put("/setIsActiveClient",adminSetIsActiveClient)
router.put("/addCaseFeeClient",adminAddCaseFeeClient)
router.put("/updateClientCaseFee",adminUpdateClientCaseFee)
router.put("/uploadCompanyClientTls",uploadCompanyClientTls)
router.put("/uploadCompanyPartnerTls",uploadCompanyPartnerTls)
router.put("/addEmployeeToCase",adminShareCaseToEmployee)
router.put("/addCaseCommit",adminAddCaseComment)
router.put("/changeCaseIsActive",adminSetIsActiveCase)
router.get("/dashboard",adminDashboard)

router.post("/addJob",adminAddJob)
router.delete("/deleteJobById",adminDeleteJob)
router.put("/addReferenceCaseAndMarge",adminAddReferenceCaseAndMarge)
router.delete("/deleteCaseById",adminDeleteCaseById)
router.delete("/deletePartnerById",adminDeletePartnerById)
router.delete("/deleteClientById",adminDeleteClientById)

router.get("/viewAllComplaint",viewAllAdminComplaint)
router.delete("/adminRemoveComplaintById",adminRemoveComplaintById)
router.get("/adminViewPartnerReport",adminViewPartnerReport)









export default router