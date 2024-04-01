import express from 'express';
const router = express.Router();
import { adminSignin,adminSignUp,createEmployeeAccount,adminUpdateEmployeeAccount,adminDeleteEmployeeAccount,adminResetPassword,adminSetIsActiveEmployee,changeStatusAdminCase,getSettingDetails,
viewAllAdminCase,viewCaseByIdByAdmin,viewAllPartnerByAdmin,viewPartnerByIdByAdmin,adminSetIsActivePartner,adminViewAllEmployee,
adminViewAllClient,adminViewClientById,adminSetIsActiveClient,adminSettingDetailsUpdate,adminAddCaseFeeClient,adminUpdateClientCaseFee,
uploadCompanyClientTls,uploadCompanyPartnerTls,adminShareCaseToEmployee,adminAddCaseComment,
adminAuthenticate,adminDashboard,adminUpdateCaseById,adminAddReferenceCaseAndMarge,adminDeleteCaseById,
adminDeletePartnerById,adminDeleteClientById,adminSetIsActiveCase,
adminEditCaseStatus,adminSetClientTag,adminSetPartnerTag,adminForgetPassword,adminResetForgetPassword,
getAllAdmin,superAdminSetIsActiveAdmin,superAdminDeleteAdminById,adminViewPartnerReport,
adminRemoveReferenceCase,adminEditClient,adminUpdateParnterProfile,adminUpdatePartnerBankingDetails,
adminDeleteCaseDocById,adminViewEmpSaleReport,adminViewEmpSalePartnerReport,
adminDownloadAllCase,adminDownloadAllPartner,adminDownloadPartnerReport,
adminEmpSaleReportDownload,adminEmpSalePartnerReportDownload,adminAllClientDownload,
adminGetSaleEmployee,adminSharePartnerToSaleEmp,adminGetNormalEmployee,adminRemovePartnerToSaleEmp
} from '../controller/admin.js';

import { adminAddJob,adminDeleteJob } from '../controller/job.js';
import { viewAllAdminComplaint,adminRemoveComplaintById } from '../controller/complaint.js';

//  for admin 
router.get("/dashboard",adminDashboard)
router.post("/signin", adminSignin)
router.post("/signup", adminSignUp)
router.get("/authenticate",adminAuthenticate)
router.post("/resetPassword", adminResetPassword)
router.get("/getSettingDetails",getSettingDetails)
router.put("/forgetPassword",adminForgetPassword)
router.put("/resetForgetPassword",adminResetForgetPassword)

// for super-admin
router.get("/superAdmin/allAdmin",getAllAdmin)
router.put("/superAdmin/setIsActiveAdmin",superAdminSetIsActiveAdmin)
router.delete("/superAdmin/deleteAdminById",superAdminDeleteAdminById)
router.put("/settingDetailsUpdate",adminSettingDetailsUpdate)

// for employee
router.post("/createEmployeeAccount", createEmployeeAccount)
router.put("/updateEmployeeAccount", adminUpdateEmployeeAccount)
router.delete("/deleteEmployeeAccount", adminDeleteEmployeeAccount)
router.put("/setIsActiveEmployee",adminSetIsActiveEmployee)
router.get("/adminViewAllEmployee",adminViewAllEmployee)
router.get("/sale-employee",adminGetSaleEmployee)
router.get("/normal-employee",adminGetNormalEmployee)

// for partner
router.get("/viewAllPartner",viewAllPartnerByAdmin)
router.get("/viewPartnerById",viewPartnerByIdByAdmin)
router.put("/updateParnterProfile",adminUpdateParnterProfile)
router.put("/setPartnerTag",adminSetPartnerTag)
router.put("/updatePartnerBankingDetails",adminUpdatePartnerBankingDetails)
router.put("/changePartnerStatus",adminSetIsActivePartner)
router.delete("/deletePartnerById",adminDeletePartnerById)

// for client
router.get("/ViewAllClient",adminViewAllClient)
router.get("/ViewClientById",adminViewClientById)
router.put("/setIsActiveClient",adminSetIsActiveClient)
router.put("/setClientTag",adminSetClientTag)
router.put("/editClient",adminEditClient)
router.delete("/deleteClientById",adminDeleteClientById)


// for case
router.get("/viewAllCase",viewAllAdminCase)
router.put("/changeCaseStatus",changeStatusAdminCase)
router.get("/viewCaseById",viewCaseByIdByAdmin)
router.post("/updateCaseById",adminUpdateCaseById)
router.put("/editCaseProcessById",adminEditCaseStatus)
router.put("/addCaseFeeClient",adminAddCaseFeeClient)
router.put("/updateClientCaseFee",adminUpdateClientCaseFee)
router.put("/changeCaseIsActive",adminSetIsActiveCase)
router.put("/addReferenceCaseAndMarge",adminAddReferenceCaseAndMarge)
router.delete("/deleteCaseById",adminDeleteCaseById)
router.delete("/deleteCaseDocId",adminDeleteCaseDocById)


// share case
router.put("/addEmployeeToCase",adminShareCaseToEmployee)
router.put("/addCaseCommit",adminAddCaseComment)


// share partner
router.put("/addSharePartner",adminSharePartnerToSaleEmp)
router.put("/removePartner",adminRemovePartnerToSaleEmp)


//  for tnc
router.put("/uploadCompanyClientTls",uploadCompanyClientTls)
router.put("/uploadCompanyPartnerTls",uploadCompanyPartnerTls)

// for job
router.post("/addJob",adminAddJob)
router.delete("/deleteJobById",adminDeleteJob)
router.put("/removeReferenceCase",adminRemoveReferenceCase)

// for complaint
router.get("/viewAllComplaint",viewAllAdminComplaint)
router.delete("/adminRemoveComplaintById",adminRemoveComplaintById)

// for report
router.get("/adminViewPartnerReport",adminViewPartnerReport)
router.get("/adminViewEmpSaleReport",adminViewEmpSaleReport)
router.get("/adminViewEmpSalePartnerReport",adminViewEmpSalePartnerReport)

// for download
router.get("/download/allcase",adminDownloadAllCase)
router.get("/download/allpartner",adminDownloadAllPartner)
router.get("/download/allClient",adminAllClientDownload)
router.get("/download/partnerReport",adminDownloadPartnerReport)
router.get("/download/empSaleReport",adminEmpSaleReportDownload)
router.get("/download/empSalePartnerReport",adminEmpSalePartnerReportDownload)





// router.put("/updateModalSchema",adminUpdateModalSchema)









export default router