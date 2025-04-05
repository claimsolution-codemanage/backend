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
adminGetSaleEmployee,adminSharePartnerToSaleEmp,adminGetNormalEmployee,adminRemovePartnerToSaleEmp,
adminUploadImage,adminUploadAttachment,adminCreateInvoice,adminViewAllInvoice,adminViewInvoiceById,
adminUnActiveInvoice,adminEditInvoice,adminRemoveInvoice,
adminAllUnactiveCaseDoc,adminUnactiveCaseDoc,adminChangeBranch,
adminEmployeeProfile,adminDownloadEmpSathiEmployee,adminViewEmpSathiEmployee,
adminDownloadAllEmployee,adminPaidInvoice,adminAddPartnerRefToEmp,
createOrUpdateStatement,getStatement,getAllStatement,getAllNotification,updateNotification,
adminAddOrUpdatePayment,adminDownloadAllInvoice,adminDownloadAllStatement,adminFindCaseByFileNo,
adminAddOrUpdateEmpJoiningForm,
admingetEmpJoiningForm,
adminCreateOrUpdateCaseForm
} from '../controller/admin.js';


import { adminAddJob,adminDeleteJob } from '../controller/job.js';
import { viewAllAdminComplaint,adminRemoveComplaintById } from '../controller/complaint.js';
import { authAdmin } from '../middleware/authentication.js';

//  for admin 
router.get("/dashboard",authAdmin,adminDashboard)
router.post("/signin", adminSignin)
router.post("/signup", adminSignUp)
router.get("/authenticate",adminAuthenticate)
router.post("/resetPassword",authAdmin ,adminResetPassword)
router.get("/getSettingDetails",authAdmin,getSettingDetails)
router.put("/forgetPassword",adminForgetPassword)
router.put("/resetForgetPassword",adminResetForgetPassword)

// for super-admin
router.get("/superAdmin/allAdmin",authAdmin,getAllAdmin)
router.put("/superAdmin/setIsActiveAdmin",authAdmin,superAdminSetIsActiveAdmin)
router.delete("/superAdmin/deleteAdminById",authAdmin,superAdminDeleteAdminById)
router.put("/settingDetailsUpdate",authAdmin,adminSettingDetailsUpdate)

// for employee
router.post("/createEmployeeAccount",authAdmin, createEmployeeAccount)
router.get("/employee/profile",authAdmin,adminEmployeeProfile)
router.put("/updateEmployeeAccount",authAdmin, adminUpdateEmployeeAccount)
router.delete("/deleteEmployeeAccount",authAdmin, adminDeleteEmployeeAccount)
router.put("/setIsActiveEmployee",authAdmin,adminSetIsActiveEmployee)
router.get("/adminViewAllEmployee",authAdmin,adminViewAllEmployee)
router.get("/sale-employee",authAdmin,adminGetSaleEmployee)
router.get("/normal-employee",authAdmin,adminGetNormalEmployee)
router.post("/employee/adminAddOrUpdateEmpJoiningForm",authAdmin,adminAddOrUpdateEmpJoiningForm)
router.get("/employee/admingetEmpJoiningForm",authAdmin,admingetEmpJoiningForm)


// for partner
router.get("/viewAllPartner",authAdmin,viewAllPartnerByAdmin)
router.get("/viewPartnerById",authAdmin,viewPartnerByIdByAdmin)
router.put("/updateParnterProfile",authAdmin,adminUpdateParnterProfile)
router.put("/setPartnerTag",authAdmin,adminSetPartnerTag)
router.put("/updatePartnerBankingDetails",authAdmin,adminUpdatePartnerBankingDetails)
router.put("/changePartnerStatus",authAdmin,adminSetIsActivePartner)
router.put("/addPartnerRefToEmp",authAdmin,adminAddPartnerRefToEmp)
router.delete("/deletePartnerById",authAdmin,adminDeletePartnerById)

// for client
router.get("/ViewAllClient",authAdmin,adminViewAllClient)
router.get("/ViewClientById",authAdmin,adminViewClientById)
router.put("/setIsActiveClient",authAdmin,adminSetIsActiveClient)
router.put("/setClientTag",authAdmin,adminSetClientTag)
router.put("/editClient",authAdmin,adminEditClient)
router.delete("/deleteClientById",authAdmin,adminDeleteClientById)


// for case
router.get("/viewAllCase",authAdmin,viewAllAdminCase)
router.put("/changeCaseStatus",authAdmin,changeStatusAdminCase)
router.get("/viewCaseById",authAdmin,viewCaseByIdByAdmin)
router.post("/updateCaseById",authAdmin,adminUpdateCaseById)
router.post("/addOrUpdatePayment",authAdmin,adminAddOrUpdatePayment)
router.put("/editCaseProcessById",authAdmin,adminEditCaseStatus)
router.put("/addCaseFeeClient",authAdmin,adminAddCaseFeeClient)
router.put("/updateClientCaseFee",authAdmin,adminUpdateClientCaseFee)
router.put("/changeCaseIsActive",authAdmin,adminSetIsActiveCase)
router.put("/addReferenceCaseAndMarge",authAdmin,adminAddReferenceCaseAndMarge)
router.put("/removeReferenceCase",authAdmin,adminRemoveReferenceCase)
router.delete("/deleteCaseById",authAdmin,adminDeleteCaseById)
router.delete("/deleteCaseDocId",authAdmin,adminDeleteCaseDocById)
router.post("/adminCreateOrUpdateCaseForm",authAdmin,adminCreateOrUpdateCaseForm)


// case doc
router.put("/unActiveDoc",authAdmin,adminUnactiveCaseDoc)
router.get("/allUnactiveCaseDoc",authAdmin,adminAllUnactiveCaseDoc)


// share case
router.put("/addEmployeeToCase",authAdmin,adminShareCaseToEmployee)
router.put("/addCaseCommit",authAdmin,adminAddCaseComment)


// share partner
router.put("/addSharePartner",authAdmin,adminSharePartnerToSaleEmp)
router.put("/removePartner",authAdmin,adminRemovePartnerToSaleEmp)


//  for tnc
router.put("/uploadCompanyClientTls",authAdmin,uploadCompanyClientTls)
router.put("/uploadCompanyPartnerTls",authAdmin,uploadCompanyPartnerTls)

// for job
router.post("/addJob",authAdmin,adminAddJob)
router.delete("/deleteJobById",authAdmin,adminDeleteJob)

// for complaint
router.get("/viewAllComplaint",authAdmin,viewAllAdminComplaint)
router.delete("/adminRemoveComplaintById",authAdmin,adminRemoveComplaintById)


// for invoice
router.post("/createInvoice",authAdmin,adminCreateInvoice)
router.get("/viewAllInvoice",authAdmin,adminViewAllInvoice)
router.get("/adminDownloadAllInvoice",authAdmin,adminDownloadAllInvoice)
router.get("/viewInvoiceById",authAdmin,adminViewInvoiceById)
router.put("/editInvoiceById",authAdmin,adminEditInvoice)
router.put("/paidInvoiceById",authAdmin,adminPaidInvoice)
router.put("/unActiveInvoiceById",authAdmin,adminUnActiveInvoice)
router.delete("/deleteInvoice",authAdmin,adminRemoveInvoice)

// for report
router.get("/adminViewPartnerReport",authAdmin,adminViewPartnerReport)
router.get("/adminViewEmpSaleReport",authAdmin,adminViewEmpSaleReport)
router.get("/adminViewEmpSalePartnerReport",authAdmin,adminViewEmpSalePartnerReport)

// for upload
router.post("/upload/image",authAdmin,adminUploadImage)
router.post("/upload/attachment",authAdmin,adminUploadAttachment)

// for download
router.get("/download/allcase",authAdmin,adminDownloadAllCase)
router.get("/download/allpartner",authAdmin,adminDownloadAllPartner)
router.get("/download/allClient",authAdmin,adminAllClientDownload)
router.get("/download/allEmployee",authAdmin,adminDownloadAllEmployee)
router.get("/download/partnerReport",authAdmin,adminDownloadPartnerReport)
router.get("/download/empSaleReport",authAdmin,adminEmpSaleReportDownload)
router.get("/download/empSalePartnerReport",authAdmin,adminEmpSalePartnerReportDownload)


// for change branch
router.put("/change-branch",authAdmin,adminChangeBranch)

// for sathi
router.get("/viewEmpSathi",authAdmin,adminViewEmpSathiEmployee)
router.get("/download/empSathi",authAdmin,adminDownloadEmpSathiEmployee)


// for statement
router.post("/createOrUpdateStatement",authAdmin,createOrUpdateStatement)
router.get("/getAllStatement",authAdmin,getStatement)
router.get("/getStatements",authAdmin,getAllStatement)
router.get("/download/downloadAllStatement",authAdmin,adminDownloadAllStatement)
router.get("/adminFindCaseByFileNo",authAdmin,adminFindCaseByFileNo)

// notification
router.get("/getAllNotification",authAdmin,getAllNotification)
router.put("/updateNotification",authAdmin,updateNotification)


// router.put("/updateModalSchema",adminUpdateModalSchema)










export default router