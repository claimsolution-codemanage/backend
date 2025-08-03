import express from 'express';
const router = express.Router();
import { adminAddJob,adminDeleteJob } from '../controller/job.js';
import { viewAllAdminComplaint,adminRemoveComplaintById } from '../controller/complaint.js';
import { authAdmin } from '../middleware/authentication.js';
import * as adminController from '../controller/admin.js'

//  for admin 
router.get("/dashboard",authAdmin,adminController.adminDashboard)
router.post("/signin", adminController.adminSignin)
router.post("/signup", adminController.adminSignUp)
router.get("/authenticate",adminController.adminAuthenticate)
router.post("/resetPassword",authAdmin ,adminController.adminResetPassword)
router.get("/getSettingDetails",authAdmin,adminController.getSettingDetails)
router.put("/forgetPassword",adminController.adminForgetPassword)
router.put("/resetForgetPassword",adminController.adminResetForgetPassword)

// for super-admin
router.get("/superAdmin/allAdmin",authAdmin,adminController.getAllAdmin)
router.put("/superAdmin/setIsActiveAdmin",authAdmin,adminController.superAdminSetIsActiveAdmin)
router.delete("/superAdmin/deleteAdminById",authAdmin,adminController.superAdminDeleteAdminById)
router.put("/settingDetailsUpdate",authAdmin,adminController.adminSettingDetailsUpdate)

// for employee
router.post("/createEmployeeAccount",authAdmin,adminController.createEmployeeAccount)
router.get("/employee/profile",authAdmin,adminController.adminEmployeeProfile)
router.put("/updateEmployeeAccount",authAdmin,adminController.adminUpdateEmployeeAccount)
router.delete("/deleteEmployeeAccount",authAdmin,adminController.adminDeleteEmployeeAccount)
router.put("/setIsActiveEmployee",authAdmin,adminController.adminSetIsActiveEmployee)
router.get("/adminViewAllEmployee",authAdmin,adminController.adminViewAllEmployee)
router.get("/sale-employee",authAdmin,adminController.adminGetSaleEmployee)
router.get("/normal-employee",authAdmin,adminController.adminGetNormalEmployee)
router.post("/employee/adminAddOrUpdateEmpJoiningForm",authAdmin,adminController.adminAddOrUpdateEmpJoiningForm)
router.get("/employee/admingetEmpJoiningForm",authAdmin,adminController.admingetEmpJoiningForm)


// for partner
router.get("/viewAllPartner",authAdmin,adminController.viewAllPartnerByAdmin)
router.get("/viewPartnerById",authAdmin,adminController.viewPartnerByIdByAdmin)
router.put("/updateParnterProfile",authAdmin,adminController.adminUpdateParnterProfile)
router.put("/setPartnerTag",authAdmin,adminController.adminSetPartnerTag)
router.put("/updatePartnerBankingDetails",authAdmin,adminController.adminUpdatePartnerBankingDetails)
router.put("/changePartnerStatus",authAdmin,adminController.adminSetIsActivePartner)
router.put("/addPartnerRefToEmp",authAdmin,adminController.adminAddPartnerRefToEmp)
router.delete("/deletePartnerById",authAdmin,adminController.adminDeletePartnerById)

// for client
router.get("/ViewAllClient",authAdmin,adminController.adminViewAllClient)
router.get("/ViewClientById",authAdmin,adminController.adminViewClientById)
router.put("/setIsActiveClient",authAdmin,adminController.adminSetIsActiveClient)
router.put("/setClientTag",authAdmin,adminController.adminSetClientTag)
router.put("/editClient",authAdmin,adminController.adminEditClient)
router.delete("/deleteClientById",authAdmin,adminController.adminDeleteClientById)


// for case
router.get("/viewAllCase",authAdmin,adminController.viewAllAdminCase)
router.put("/changeCaseStatus",authAdmin,adminController.changeStatusAdminCase)
router.get("/viewCaseById",authAdmin,adminController.viewCaseByIdByAdmin)
router.post("/adminAddCaseFile",authAdmin,adminController.adminAddCaseFile)
router.post("/updateCaseById",authAdmin,adminController.adminUpdateCaseById)
router.post("/addOrUpdatePayment",authAdmin,adminController.adminAddOrUpdatePayment)
router.put("/editCaseProcessById",authAdmin,adminController.adminEditCaseStatus)
router.put("/addCaseFeeClient",authAdmin,adminController.adminAddCaseFeeClient)
router.put("/updateClientCaseFee",authAdmin,adminController.adminUpdateClientCaseFee)
router.put("/changeCaseIsActive",authAdmin,adminController.adminSetIsActiveCase)
router.put("/addReferenceCaseAndMarge",authAdmin,adminController.adminAddReferenceCaseAndMarge)
router.put("/removeReferenceCase",authAdmin,adminController.adminRemoveReferenceCase)
router.delete("/deleteCaseById",authAdmin,adminController.adminDeleteCaseById)
router.delete("/deleteCaseDocId",authAdmin,adminController.adminDeleteCaseDocById)
router.post("/adminCreateOrUpdateCaseForm",authAdmin,adminController.adminCreateOrUpdateCaseForm)


// case doc
router.put("/unActiveDoc",authAdmin,adminController.adminUnactiveCaseDoc)
router.get("/allUnactiveCaseDoc",authAdmin,adminController.adminAllUnactiveCaseDoc)


// share case
router.put("/addEmployeeToCase",authAdmin,adminController.adminShareCaseToEmployee)
router.put("/addCaseCommit",authAdmin,adminController.adminAddCaseComment)


// share partner
router.put("/addSharePartner",authAdmin,adminController.adminSharePartnerToSaleEmp)
router.put("/removePartner",authAdmin,adminController.adminRemovePartnerToSaleEmp)

// share client
router.put("/shareClient",authAdmin,adminController.adminShareClientToSaleEmp)

//  for tnc
router.put("/uploadCompanyClientTls",authAdmin,adminController.uploadCompanyClientTls)
router.put("/uploadCompanyPartnerTls",authAdmin,adminController.uploadCompanyPartnerTls)

// for job
router.post("/addJob",authAdmin,adminAddJob)
router.delete("/deleteJobById",authAdmin,adminDeleteJob)

// for complaint
router.get("/viewAllComplaint",authAdmin,viewAllAdminComplaint)
router.delete("/adminRemoveComplaintById",authAdmin,adminRemoveComplaintById)


// for invoice
router.post("/createInvoice",authAdmin,adminController.adminCreateInvoice)
router.get("/viewAllInvoice",authAdmin,adminController.adminViewAllInvoice)
router.get("/adminDownloadAllInvoice",authAdmin,adminController.adminDownloadAllInvoice)
router.get("/viewInvoiceById",authAdmin,adminController.adminViewInvoiceById)
router.put("/editInvoiceById",authAdmin,adminController.adminEditInvoice)
router.put("/editInvoiceNo",authAdmin,adminController.adminEditInvoiceNo)
router.put("/paidInvoiceById",authAdmin,adminController.adminPaidInvoice)
router.put("/unActiveInvoiceById",authAdmin,adminController.adminUnActiveInvoice)
router.delete("/deleteInvoice",authAdmin,adminController.adminRemoveInvoice)

// for report
router.get("/adminViewPartnerReport",authAdmin,adminController.adminViewPartnerReport)
router.get("/adminViewEmpSaleReport",authAdmin,adminController.adminViewEmpSaleReport)
router.get("/adminViewEmpSalePartnerReport",authAdmin,adminController.adminViewEmpSalePartnerReport)

// for upload
router.post("/upload/image",authAdmin,adminController.adminUploadImage)
router.post("/upload/attachment",authAdmin,adminController.adminUploadAttachment)

// for download
router.get("/download/allcase",authAdmin,adminController.adminDownloadAllCase)
router.get("/download/allpartner",authAdmin,adminController.adminDownloadAllPartner)
router.get("/download/allClient",authAdmin,adminController.adminAllClientDownload)
router.get("/download/allEmployee",authAdmin,adminController.adminDownloadAllEmployee)
router.get("/download/partnerReport",authAdmin,adminController.adminDownloadPartnerReport)
router.get("/download/empSaleReport",authAdmin,adminController.adminEmpSaleReportDownload)
router.get("/download/empSalePartnerReport",authAdmin,adminController.adminEmpSalePartnerReportDownload)


// for change branch
router.put("/change-branch",authAdmin,adminController.adminChangeBranch)

// for sathi
router.get("/viewEmpSathi",authAdmin,adminController.adminViewEmpSathiEmployee)
router.get("/download/empSathi",authAdmin,adminController.adminDownloadEmpSathiEmployee)


// for statement
router.post("/createOrUpdateStatement",authAdmin,adminController.createOrUpdateStatement)
router.get("/getAllStatement",authAdmin,adminController.getStatement)
router.get("/getStatements",authAdmin,adminController.getAllStatement)
router.get("/download/downloadAllStatement",authAdmin,adminController.adminDownloadAllStatement)
router.get("/adminFindCaseByFileNo",authAdmin,adminController.adminFindCaseByFileNo)
router.put("/adminChangeStatementStatus",authAdmin,adminController.adminChangeStatementStatus)

// notification
router.get("/getAllNotification",authAdmin,adminController.getAllNotification)
router.put("/updateNotification",authAdmin,adminController.updateNotification)


// router.get("/updateModalSchema",adminController.adminUpdateModalSchema)
// router.get("/updatePartnerSchema",adminController.updatePartnerSchema)
// router.get("/updateCaseSchema",adminController.updateCaseSchema)
// router.get("/updateCaseAndMargeSchema",adminController.updateCaseAndMargeSchema)











export default router