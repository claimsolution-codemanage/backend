import express from 'express';
const router = express.Router();
import * as employeeController from '../controller/employee.js'
import { authEmployee } from '../middleware/authentication.js';
import * as employeeCaseController from '../controller/case/employeeCaseController.js'
import * as empPartnerController from '../controller/partner/empPartnerController.js'
import * as empClientController from '../controller/client/empClientController.js'
import * as empTeamController from '../controller/team/empTeamController.js'

// other routes
import empLeadRoutes from "../routes/leads/empLeadRoutes.js"
import caseFormRoutes from "../routes/caseForm/empCaseFormRoutes.js"
import empCasePaymentRoutes from "./casePayment/empCasePaymentRoutes.js"
import empMailRoutes from "./mail/empMailRoutes.js"
import empInvoiceRoutes from "./invoice/empInvoiceRoutes.js"
import empStatementRoutes from "./statement/empStatmentRoutes.js"




router.post("/signin", employeeController.employeeSignin)
router.get("/authenticate", authEmployee, employeeController.employeeAuthenticate)
router.get("/profile", authEmployee, employeeController.empProfile)
router.post("/addSathiTeamAcc", authEmployee, employeeController.createSathiTeamAcc)
router.post("/resetPassword", authEmployee, employeeController.employeeResetPassword)
router.put("/resetForgetPassword", employeeController.employeeResetForgetPassword)
router.put("/employeeForgetPassword", employeeController.employeeForgetPassword)
router.put("/updateEmployeeAccount", authEmployee, employeeController.updateEmployeeAccount)
router.get("/view/sathiTeam", authEmployee, employeeController.empViewSathiEmployee)
router.get("/download/sathiTeam", authEmployee, employeeController.empDownloadSathiEmployee)
router.get("/operation/normalEmployee", authEmployee, employeeController.empOptGetNormalEmployee)
router.get('/opeation/sale-employee', authEmployee, employeeController.empOpGetSaleEmployee)
router.delete("/team/deleteTeamEmpAccount", authEmployee, empTeamController.deleteTeamEmpAccount)



router.get("/all/dashboard", authEmployee, employeeController.allEmployeeDashboard)

// case
router.get("/case/viewAllCase", authEmployee, employeeCaseController.viewAllCase)
router.get("/case/viewCaseById", authEmployee, employeeCaseController.viewCaseById)
router.put("/case/updateCaseById", authEmployee, employeeCaseController.updateCaseById)
router.put("/case/changeCaseIsActive", authEmployee, employeeCaseController.changeCaseIsActive)
router.post("/case/addCaseFile", authEmployee, employeeCaseController.addCaseFile)
router.get("/case/findCaseByFileNo", authEmployee, employeeCaseController.empFindCaseByFileNo)
router.put("/case/updateCaseStatus", authEmployee, employeeCaseController.updateCaseStatus)
router.put("/case/add_or_update_case_comment", authEmployee, employeeCaseController.empAddOrUpdateCaseComment)
router.put("/case/addReferenceCaseAndMarge", authEmployee, employeeCaseController.addReferenceCaseAndMarge)
router.put("/case/removeCaseReference", authEmployee, employeeCaseController.removeCaseReference)
router.post("/case/addOrUpdateCasePayment", authEmployee, employeeCaseController.addOrUpdateCasePayment)
router.delete("/case/deleteCaseById", authEmployee, employeeCaseController.deleteCaseById)
router.put("/case/renameCaseDocFolder", authEmployee, employeeCaseController.renameCaseDocFolder)
// router.post('/opeation/empOpCreateOrUpdateCaseForm',authEmployee,employeeCaseFormController.empOpCreateOrUpdateCaseForm)
// router.get('/opeation/empOpGetCaseFormById/:formId/:caseId',authEmployee,employeeCaseFormController.empOpGetCaseFormById)

// case doc
router.put("/unActiveDoc", authEmployee, employeeController.empUnactiveCaseDoc)
router.get("/allUnactiveCaseDoc", authEmployee, employeeController.empAllUnactiveCaseDoc)
router.delete("/case/deleteCaseDocById", authEmployee, employeeCaseController.deleteCaseDocById)



// client
router.get("/viewAllClient", authEmployee, employeeController.employeeViewAllClient)
router.get("/viewClientById", authEmployee, employeeController.employeeViewClientById)
router.put("/changeClientStatus", authEmployee, employeeController.empSetIsActiveClient)
router.put("/updateClient", authEmployee, employeeController.employeeEditClient)
router.get("/download/allClient", authEmployee, employeeController.empClientDownload)
router.delete("/client/deleteClientById", authEmployee, empClientController.deleteClientById)


// partner
router.get("/viewAllPartner", authEmployee, employeeController.employeeViewAllPartner)
router.get("/viewPartnerById", authEmployee, employeeController.employeeViewPartnerById)
router.put("/changePartnerStatus", authEmployee, employeeController.employeeSetIsActivePartner)
router.put("/updatePartnerProfile", authEmployee, employeeController.employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails", authEmployee, employeeController.employeeUpdatePartnerBankingDetails)
router.put("/operation/addPartnerRefToEmp", authEmployee, employeeController.empAddPartnerRefToEmp)
router.delete("/partner/deletePartnerById", authEmployee, empPartnerController.deletePartnerById)







// for sales employee
router.post("/addPartner", authEmployee, employeeController.saleEmployeeAddPartner)
router.post("/sale/addCase", authEmployee, employeeController.saleEmployeeAddCase)
router.get("/sale/downloadCaseReport", authEmployee, employeeController.salesDownloadCaseReport)
router.get("/sale/partnerReport", authEmployee, employeeController.saleEmpViewPartnerReport)


// for upload
router.post("/upload/image", authEmployee, employeeController.employeeUploadImage)
router.post("/upload/attachment", authEmployee, employeeController.employeeUploadAttachment)

// for share
router.put("/operation/shareCase", authEmployee, employeeController.empOptShareCaseToEmployee)
router.put("/operation/addSharePartner", authEmployee, employeeController.empOpSharePartnerToSaleEmp)
router.put("/operation/shareClient", authEmployee, employeeController.empOpShareClientToSaleEmp)

// report
router.get("/partnerReport", authEmployee, employeeController.empDownloadPartnerReport)

// download
router.get("/download/allPartner", authEmployee, employeeController.employeeDownloadAllPartner)

// emphead
router.get("/head/allEmployee", authEmployee, employeeController.empViewAllEmployee)
router.get("/download/allEmployee", authEmployee, employeeController.empDownloadAllEmployee)
router.put("/setIsActiveEmployee", authEmployee, employeeController.empSetIsActiveEmployee)




// change branch
router.put("/operation/change-branch", authEmployee, employeeController.empChangeBranch)


// notification section
router.get("/emp/getAllNotification", authEmployee, employeeController.getAllNotification)
router.put("/emp/updateNotification", authEmployee, employeeController.updateNotification)


router.use("/caseForm", caseFormRoutes)
router.use("/lead", empLeadRoutes)
router.use("/case_payment", empCasePaymentRoutes)
router.use("/mail", empMailRoutes)
router.use("/invoice", empInvoiceRoutes)
router.use("/statement", empStatementRoutes)




export default router