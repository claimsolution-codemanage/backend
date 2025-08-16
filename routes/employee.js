import express from 'express';
const router = express.Router();
import * as employeeController from '../controller/employee.js'
import { authEmployee } from '../middleware/authentication.js';


router.post("/signin",employeeController.employeeSignin)
router.get("/authenticate",employeeController.employeeAuthenticate)
router.get("/profile",authEmployee,employeeController.empProfile)
router.post("/addSathiTeamAcc",authEmployee,employeeController.createSathiTeamAcc)
router.post("/resetPassword",authEmployee,employeeController.employeeResetPassword)
router.put("/resetForgetPassword",employeeController.employeeResetForgetPassword)
router.put("/employeeForgetPassword",employeeController.employeeForgetPassword)
router.put("/updateEmployeeAccount",authEmployee,employeeController.updateEmployeeAccount)
router.get("/view/sathiTeam",authEmployee,employeeController.empViewSathiEmployee)
router.get("/download/sathiTeam",authEmployee,employeeController.empDownloadSathiEmployee)
router.get("/operation/normalEmployee",authEmployee,employeeController.empOptGetNormalEmployee)
router.get('/opeation/sale-employee',authEmployee,employeeController.empOpGetSaleEmployee)


router.get("/all/dashboard",authEmployee,employeeController.allEmployeeDashboard)

// case
router.get("/viewAllCase",authEmployee,employeeController.viewAllEmployeeCase)
router.get("/viewCaseById",authEmployee,employeeController.employeeViewCaseByIdBy)
router.put("/changeCaseIsActive",authEmployee,employeeController.empSetIsActiveCase)
router.post("/empAddCaseFile",authEmployee,employeeController.empAddCaseFile)
router.get("/employeeFindCaseByFileNo",authEmployee,employeeController.employeeFindCaseByFileNo)
router.put("/changeCaseStatus",authEmployee,employeeController.changeStatusEmployeeCase)
router.put("/addCaseComment",authEmployee,employeeController.employeeAddCaseComment)
router.put("/updateCaseById",authEmployee,employeeController.employeeUpdateCaseById)
router.put("/operation/addReferenceCaseAndMarge",authEmployee,employeeController.empAddReferenceCaseAndMarge)
router.put("/operation/removeReferenceCase",authEmployee,employeeController.empRemoveReferenceCase)
router.post("/emp/empAddOrUpdatePayment",authEmployee,employeeController.empAddOrUpdatePayment)
router.post('/opeation/empOpCreateOrUpdateCaseForm',authEmployee,employeeController.empOpCreateOrUpdateCaseForm)

// case doc
router.put("/unActiveDoc",authEmployee,employeeController.empUnactiveCaseDoc)
router.get("/allUnactiveCaseDoc",authEmployee,employeeController.empAllUnactiveCaseDoc)


// client
router.get("/viewAllClient",authEmployee,employeeController.employeeViewAllClient)
router.get("/viewClientById",authEmployee,employeeController.employeeViewClientById)
router.put("/changeClientStatus",authEmployee,employeeController.empSetIsActiveClient)
router.put("/updateClient",authEmployee,employeeController.employeeEditClient)
router.get("/download/allClient",authEmployee,employeeController.empClientDownload)

// partner
router.get("/viewAllPartner",authEmployee,employeeController.employeeViewAllPartner)
router.get("/viewPartnerById",authEmployee,employeeController.employeeViewPartnerById)
router.put("/changePartnerStatus",authEmployee,employeeController.employeeSetIsActivePartner)
router.put("/updatePartnerProfile",authEmployee,employeeController.employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails",authEmployee,employeeController.employeeUpdatePartnerBankingDetails)
router.put("/operation/addPartnerRefToEmp",authEmployee,employeeController.empAddPartnerRefToEmp)



// for finance employee
router.post("/finance/createInvoice",authEmployee,employeeController.employeeCreateInvoice)
router.get("/finance/viewAllInvoice",authEmployee,employeeController.employeeViewAllInvoice)
router.get("/finance/viewInvoiceById",authEmployee,employeeController.employeeViewInvoiceById)
router.put("/finance/editInvoiceById",authEmployee,employeeController.employeeEditInvoice)
router.put("/finance/editInvoiceNo",authEmployee,employeeController.employeeEditInvoiceNo)
router.put("/finance/paidInvoiceById",authEmployee,employeeController.empOpPaidInvoice)
router.get("/emp/empDownloadAllInvoice",authEmployee,employeeController.empDownloadAllInvoice)
router.put("/finance/unActiveInvoiceById",authEmployee,employeeController.employeeUnActiveInvoice)
router.get("/finance/downloadInvoiceById",authEmployee,employeeController.employeeDownloadInvoiceById)
router.delete("/finance/removeInvoiceById",authEmployee,employeeController.employeeRemoveInvoice)

// for sales employee
router.post("/addPartner",authEmployee,employeeController.saleEmployeeAddPartner)
router.post("/sale/addCase",authEmployee,employeeController.saleEmployeeAddCase)
router.get("/sale/downloadCaseReport",authEmployee,employeeController.salesDownloadCaseReport)
router.get("/sale/partnerReport",authEmployee,employeeController.saleEmpViewPartnerReport)


// for upload
router.post("/upload/image",authEmployee,employeeController.employeeUploadImage)
router.post("/upload/attachment",authEmployee,employeeController.employeeUploadAttachment)

// for share
router.put("/operation/shareCase",authEmployee,employeeController.empOptShareCaseToEmployee)
router.put("/operation/addSharePartner",authEmployee,employeeController.empOpSharePartnerToSaleEmp)
router.put("/operation/shareClient",authEmployee,employeeController.empOpShareClientToSaleEmp)

// report
router.get("/partnerReport",authEmployee,employeeController.empDownloadPartnerReport)

// download
router.get("/download/allPartner",authEmployee,employeeController.employeeDownloadAllPartner)

// emphead
router.get("/head/allEmployee",authEmployee,employeeController.empViewAllEmployee)
router.get("/download/allEmployee",authEmployee,employeeController.empDownloadAllEmployee)
router.put("/setIsActiveEmployee",authEmployee,employeeController.empSetIsActiveEmployee)




// change branch
router.put("/operation/change-branch",authEmployee,employeeController.empChangeBranch)

// for statement
router.post("/emp/createOrUpdateStatement",authEmployee,employeeController.createOrUpdateStatement)
router.get("/emp/getAllStatement",authEmployee,employeeController.getStatement)
router.get("/emp/download/empDownloadAllStatement",authEmployee,employeeController.empDownloadAllStatement)
router.get("/emp/getStatements",authEmployee,employeeController.getAllStatement)
router.put("/emp/empOpChangeStatementStatus",authEmployee,employeeController.empOpChangeStatementStatus)

// notification section
router.get("/emp/getAllNotification",authEmployee,employeeController.getAllNotification)
router.put("/emp/updateNotification",authEmployee,employeeController.updateNotification)




export default router