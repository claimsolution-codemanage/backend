import express from 'express';
const router = express.Router();
import { employeeResetPassword,employeeSignin,empProfile,changeStatusEmployeeCase,viewAllEmployeeCase, employeeViewCaseByIdBy,
employeeViewAllClient,employeeViewClientById,employeeViewAllPartner,employeeViewPartnerById,employeeForgetPassword,
employeeAuthenticate,employeeAddCaseComment,employeeResetForgetPassword,
employeeCreateInvoice,employeeViewAllInvoice,employeeViewInvoiceById,employeeDownloadInvoiceById,
employeeEditInvoice,allEmployeeDashboard,employeeUnActiveInvoice,employeeUpdateCaseById,
employeeEditClient,employeeupdateParnterProfile,employeeUpdatePartnerBankingDetails,
saleEmployeeAddPartner,saleEmployeeAddCase,employeeUploadImage,employeeUploadAttachment,
employeeRemoveInvoice,salesDownloadCaseReport,saleEmpViewPartnerReport,empDownloadPartnerReport,
employeeDownloadAllPartner,empViewAllEmployee,empAddReferenceCaseAndMarge,empRemoveReferenceCase,
empChangeBranch,createSathiTeamAcc,empViewSathiEmployee,empDownloadSathiEmployee,empOptGetNormalEmployee,
empOptShareCaseToEmployee,empDownloadAllEmployee,empClientDownload,empOpPaidInvoice,empOpGetSaleEmployee,
empOpSharePartnerToSaleEmp,empAddPartnerRefToEmp,createOrUpdateStatement,getStatement,updateEmployeeAccount,getAllStatement,
getAllNotification,updateNotification,empAddOrUpdatePayment,empDownloadAllInvoice,
empDownloadAllStatement,employeeFindCaseByFileNo
} from '../controller/employee.js';


router.post("/signin",employeeSignin)
router.get("/authenticate",employeeAuthenticate)
router.get("/profile",empProfile)
router.post("/addSathiTeamAcc",createSathiTeamAcc)
router.post("/resetPassword",employeeResetPassword)
router.put("/resetForgetPassword",employeeResetForgetPassword)
router.put("/employeeForgetPassword",employeeForgetPassword)
router.put("/updateEmployeeAccount",updateEmployeeAccount)
router.get("/view/sathiTeam",empViewSathiEmployee)
router.get("/download/sathiTeam",empDownloadSathiEmployee)
router.get("/operation/normalEmployee",empOptGetNormalEmployee)
router.get('/opeation/sale-employee',empOpGetSaleEmployee)


router.get("/all/dashboard",allEmployeeDashboard)

// case
router.get("/viewAllCase",viewAllEmployeeCase)
router.get("/viewCaseById",employeeViewCaseByIdBy)
router.get("/employeeFindCaseByFileNo",employeeFindCaseByFileNo)
router.put("/changeCaseStatus",changeStatusEmployeeCase)
router.put("/addCaseComment",employeeAddCaseComment)
router.put("/updateCaseById",employeeUpdateCaseById)
router.put("/operation/addReferenceCaseAndMarge",empAddReferenceCaseAndMarge)
router.put("/operation/removeReferenceCase",empRemoveReferenceCase)
router.post("/emp/empAddOrUpdatePayment",empAddOrUpdatePayment)



// client
router.get("/viewAllClient",employeeViewAllClient)
router.get("/viewClientById",employeeViewClientById)
router.put("/updateClient",employeeEditClient)
router.get("/download/allClient",empClientDownload)

// partner
router.get("/viewAllPartner",employeeViewAllPartner)
router.get("/viewPartnerById",employeeViewPartnerById)
router.put("/updatePartnerProfile",employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails",employeeUpdatePartnerBankingDetails)
router.put("/operation/addPartnerRefToEmp",empAddPartnerRefToEmp)



// for finance employee
router.post("/finance/createInvoice",employeeCreateInvoice)
router.get("/finance/viewAllInvoice",employeeViewAllInvoice)
router.get("/finance/viewInvoiceById",employeeViewInvoiceById)
router.put("/finance/editInvoiceById",employeeEditInvoice)
router.put("/finance/paidInvoiceById",empOpPaidInvoice)
router.get("/emp/empDownloadAllInvoice",empDownloadAllInvoice)
router.put("/finance/unActiveInvoiceById",employeeUnActiveInvoice)
router.get("/finance/downloadInvoiceById",employeeDownloadInvoiceById)
router.delete("/finance/removeInvoiceById",employeeRemoveInvoice)

// for sales employee
router.post("/addPartner",saleEmployeeAddPartner)
router.post("/sale/addCase",saleEmployeeAddCase)
router.get("/sale/downloadCaseReport",salesDownloadCaseReport)
router.get("/sale/partnerReport",saleEmpViewPartnerReport)


// for upload
router.post("/upload/image",employeeUploadImage)
router.post("/upload/attachment",employeeUploadAttachment)

// for share
router.put("/operation/shareCase",empOptShareCaseToEmployee)
router.put("/operation/addSharePartner",empOpSharePartnerToSaleEmp)

// report
router.get("/partnerReport",empDownloadPartnerReport)

// download
router.get("/download/allPartner",employeeDownloadAllPartner)

// emphead
router.get("/head/allEmployee",empViewAllEmployee)
router.get("/download/allEmployee",empDownloadAllEmployee)



// change branch
router.put("/operation/change-branch",empChangeBranch)

// for statement
router.post("/emp/createOrUpdateStatement",createOrUpdateStatement)
router.get("/emp/getAllStatement",getStatement)
router.get("/emp/download/empDownloadAllStatement",empDownloadAllStatement)
router.get("/emp/getStatements",getAllStatement)

// notification section
router.get("/emp/getAllNotification",getAllNotification)
router.put("/emp/updateNotification",updateNotification)




export default router