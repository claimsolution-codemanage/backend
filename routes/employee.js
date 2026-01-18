import express from 'express';
const router = express.Router();
import * as employeeController from '../controller/employee.js'
import caseFormRoutes from "../routes/caseForm/empCaseFormRoutes.js"
import { authEmployee } from '../middleware/authentication.js';
import * as employeeCaseController from '../controller/case/employeeCaseController.js'
import * as empPartnerController from '../controller/partner/empPartnerController.js'
import * as empClientController from '../controller/client/empClientController.js'
import * as empInvoiceController from '../controller/invoice/empInvoiceController.js'
import * as empTeamController from '../controller/team/empTeamController.js'



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
router.delete("/team/deleteTeamEmpAccount",authEmployee,empTeamController.deleteTeamEmpAccount)



router.get("/all/dashboard",authEmployee,employeeController.allEmployeeDashboard)

// case
router.get("/case/viewAllCase",authEmployee,employeeCaseController.viewAllCase)
router.get("/case/viewCaseById",authEmployee,employeeCaseController.viewCaseById)
router.put("/case/updateCaseById",authEmployee,employeeCaseController.updateCaseById)
router.put("/case/changeCaseIsActive",authEmployee,employeeCaseController.changeCaseIsActive)
router.post("/case/addCaseFile",authEmployee,employeeCaseController.addCaseFile)
router.get("/case/findCaseByFileNo",authEmployee,employeeCaseController.empFindCaseByFileNo)
router.put("/case/updateCaseStatus",authEmployee,employeeCaseController.updateCaseStatus)
router.put("/case/add_or_update_case_comment",authEmployee,employeeCaseController.empAddOrUpdateCaseComment)
router.put("/case/addReferenceCaseAndMarge",authEmployee,employeeCaseController.addReferenceCaseAndMarge)
router.put("/case/removeCaseReference",authEmployee,employeeCaseController.removeCaseReference)
router.post("/case/addOrUpdateCasePayment",authEmployee,employeeCaseController.addOrUpdateCasePayment)
router.delete("/case/deleteCaseById",authEmployee,employeeCaseController.deleteCaseById)
// router.post('/opeation/empOpCreateOrUpdateCaseForm',authEmployee,employeeCaseFormController.empOpCreateOrUpdateCaseForm)
// router.get('/opeation/empOpGetCaseFormById/:formId/:caseId',authEmployee,employeeCaseFormController.empOpGetCaseFormById)

// case doc
router.put("/unActiveDoc",authEmployee,employeeController.empUnactiveCaseDoc)
router.get("/allUnactiveCaseDoc",authEmployee,employeeController.empAllUnactiveCaseDoc)
router.delete("/case/deleteCaseDocById",authEmployee,employeeCaseController.deleteCaseDocById)



// client
router.get("/viewAllClient",authEmployee,employeeController.employeeViewAllClient)
router.get("/viewClientById",authEmployee,employeeController.employeeViewClientById)
router.put("/changeClientStatus",authEmployee,employeeController.empSetIsActiveClient)
router.put("/updateClient",authEmployee,employeeController.employeeEditClient)
router.get("/download/allClient",authEmployee,employeeController.empClientDownload)
router.delete("/client/deleteClientById",authEmployee,empClientController.deleteClientById)


// partner
router.get("/viewAllPartner",authEmployee,employeeController.employeeViewAllPartner)
router.get("/viewPartnerById",authEmployee,employeeController.employeeViewPartnerById)
router.put("/changePartnerStatus",authEmployee,employeeController.employeeSetIsActivePartner)
router.put("/updatePartnerProfile",authEmployee,employeeController.employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails",authEmployee,employeeController.employeeUpdatePartnerBankingDetails)
router.put("/operation/addPartnerRefToEmp",authEmployee,employeeController.empAddPartnerRefToEmp)
router.delete("/partner/deletePartnerById",authEmployee,empPartnerController.deletePartnerById)




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
router.delete("/invoice/deleteInvoiceById",authEmployee,empInvoiceController.deleteInvoiceById)


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


router.use("/caseForm",caseFormRoutes)

export default router