import express from 'express';
const router = express.Router();
import { adminSignin,adminSignUp,createEmployeeAccount,adminResetPassword,adminSetIsActiveEmployee,changeStatusAdminCase,getSettingDetails,
viewAllAdminCase,viewCaseByIdByAdmin,viewAllPartnerByAdmin,viewPartnerByIdByAdmin,adminSetIsActivePartner,adminViewAllEmployee,
adminViewAllClient,adminViewClientById,adminSetIsActiveClient,adminSettingDetailsUpdate,adminAddCaseFeeClient,adminUpdateClientCaseFee,
uploadCompanyClientTls,uploadCompanyPartnerTls,adminShareCaseToEmployee,adminAddCaseComment,
adminAuthenticate,adminDashboard
} from '../controller/admin.js';

import { adminAddJob,adminDeleteJob } from '../controller/job.js';


router.post("/signin", adminSignin)
router.post("/signup", adminSignUp)
router.get("/authenticate",adminAuthenticate)
router.post("/resetPassword", adminResetPassword)
router.get("/getSettingDetails",getSettingDetails)
router.put("/settingDetailsUpdate",adminSettingDetailsUpdate)
router.post("/createEmployeeAccount", createEmployeeAccount)
router.put("/setIsActiveEmployee",adminSetIsActiveEmployee)
router.get("/adminViewAllEmployee",adminViewAllEmployee)
router.put("/changeCaseStatus",changeStatusAdminCase)
router.get("/viewAllCase",viewAllAdminCase)
router.get("/viewCaseById",viewCaseByIdByAdmin)
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
router.get("/dashboard",adminDashboard)

router.post("/addJob",adminAddJob)
router.delete("/deleteJobById",adminDeleteJob)







export default router