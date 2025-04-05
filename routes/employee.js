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
empDownloadAllStatement,employeeFindCaseByFileNo,
empOpCreateOrUpdateCaseForm
} from '../controller/employee.js';
import { authEmployee } from '../middleware/authentication.js';


router.post("/signin",employeeSignin)
router.get("/authenticate",employeeAuthenticate)
router.get("/profile",authEmployee,empProfile)
router.post("/addSathiTeamAcc",authEmployee,createSathiTeamAcc)
router.post("/resetPassword",authEmployee,employeeResetPassword)
router.put("/resetForgetPassword",employeeResetForgetPassword)
router.put("/employeeForgetPassword",employeeForgetPassword)
router.put("/updateEmployeeAccount",authEmployee,updateEmployeeAccount)
router.get("/view/sathiTeam",authEmployee,empViewSathiEmployee)
router.get("/download/sathiTeam",authEmployee,empDownloadSathiEmployee)
router.get("/operation/normalEmployee",authEmployee,empOptGetNormalEmployee)
router.get('/opeation/sale-employee',authEmployee,empOpGetSaleEmployee)


router.get("/all/dashboard",authEmployee,allEmployeeDashboard)

// case
router.get("/viewAllCase",authEmployee,viewAllEmployeeCase)
router.get("/viewCaseById",authEmployee,employeeViewCaseByIdBy)
router.get("/employeeFindCaseByFileNo",authEmployee,employeeFindCaseByFileNo)
router.put("/changeCaseStatus",authEmployee,changeStatusEmployeeCase)
router.put("/addCaseComment",authEmployee,employeeAddCaseComment)
router.put("/updateCaseById",authEmployee,employeeUpdateCaseById)
router.put("/operation/addReferenceCaseAndMarge",authEmployee,empAddReferenceCaseAndMarge)
router.put("/operation/removeReferenceCase",authEmployee,empRemoveReferenceCase)
router.post("/emp/empAddOrUpdatePayment",authEmployee,empAddOrUpdatePayment)
router.post('/opeation/empOpCreateOrUpdateCaseForm',authEmployee,empOpCreateOrUpdateCaseForm)



// client
router.get("/viewAllClient",authEmployee,employeeViewAllClient)
router.get("/viewClientById",authEmployee,employeeViewClientById)
router.put("/updateClient",authEmployee,employeeEditClient)
router.get("/download/allClient",authEmployee,empClientDownload)

// partner
router.get("/viewAllPartner",authEmployee,employeeViewAllPartner)
router.get("/viewPartnerById",authEmployee,employeeViewPartnerById)
router.put("/updatePartnerProfile",authEmployee,employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails",authEmployee,employeeUpdatePartnerBankingDetails)
router.put("/operation/addPartnerRefToEmp",authEmployee,empAddPartnerRefToEmp)



// for finance employee
router.post("/finance/createInvoice",authEmployee,employeeCreateInvoice)
router.get("/finance/viewAllInvoice",authEmployee,employeeViewAllInvoice)
router.get("/finance/viewInvoiceById",authEmployee,employeeViewInvoiceById)
router.put("/finance/editInvoiceById",authEmployee,employeeEditInvoice)
router.put("/finance/paidInvoiceById",authEmployee,empOpPaidInvoice)
router.get("/emp/empDownloadAllInvoice",authEmployee,empDownloadAllInvoice)
router.put("/finance/unActiveInvoiceById",authEmployee,employeeUnActiveInvoice)
router.get("/finance/downloadInvoiceById",authEmployee,employeeDownloadInvoiceById)
router.delete("/finance/removeInvoiceById",authEmployee,employeeRemoveInvoice)

// for sales employee
router.post("/addPartner",authEmployee,saleEmployeeAddPartner)
router.post("/sale/addCase",authEmployee,saleEmployeeAddCase)
router.get("/sale/downloadCaseReport",authEmployee,salesDownloadCaseReport)
router.get("/sale/partnerReport",authEmployee,saleEmpViewPartnerReport)


// for upload
router.post("/upload/image",authEmployee,employeeUploadImage)
router.post("/upload/attachment",authEmployee,employeeUploadAttachment)

// for share
router.put("/operation/shareCase",authEmployee,empOptShareCaseToEmployee)
router.put("/operation/addSharePartner",authEmployee,empOpSharePartnerToSaleEmp)

// report
router.get("/partnerReport",authEmployee,empDownloadPartnerReport)

// download
router.get("/download/allPartner",authEmployee,employeeDownloadAllPartner)

// emphead
router.get("/head/allEmployee",authEmployee,empViewAllEmployee)
router.get("/download/allEmployee",authEmployee,empDownloadAllEmployee)



// change branch
router.put("/operation/change-branch",authEmployee,empChangeBranch)

// for statement
router.post("/emp/createOrUpdateStatement",authEmployee,createOrUpdateStatement)
router.get("/emp/getAllStatement",authEmployee,getStatement)
router.get("/emp/download/empDownloadAllStatement",authEmployee,empDownloadAllStatement)
router.get("/emp/getStatements",authEmployee,getAllStatement)

// notification section
router.get("/emp/getAllNotification",authEmployee,getAllNotification)
router.put("/emp/updateNotification",authEmployee,updateNotification)




export default router