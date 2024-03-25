import express from 'express';
const router = express.Router();
import { employeeResetPassword,employeeSignin,changeStatusEmployeeCase,viewAllEmployeeCase, employeeViewCaseByIdBy,
employeeViewAllClient,employeeViewClientById,employeeViewAllPartner,employeeViewPartnerById,employeeForgetPassword,
employeeAuthenticate,employeeAddCaseComment,employeeResetForgetPassword,
employeeCreateInvoice,employeeViewAllInvoice,employeeViewInvoiceById,employeeDownloadInvoiceById,
employeeEditInvoice,allEmployeeDashboard,employeeUnActiveInvoice,employeeUpdateCaseById,
employeeEditClient,employeeupdateParnterProfile,employeeUpdatePartnerBankingDetails,
saleEmployeeAddPartner,saleEmployeeAddCase
} from '../controller/employee.js';


router.post("/signin",employeeSignin)
router.get("/authenticate",employeeAuthenticate)
router.post("/resetPassword",employeeResetPassword)
router.put("/resetForgetPassword",employeeResetForgetPassword)
router.put("/employeeForgetPassword",employeeForgetPassword)

router.get("/all/dashboard",allEmployeeDashboard)

router.get("/viewAllCase",viewAllEmployeeCase)
router.get("/viewCaseById",employeeViewCaseByIdBy)
router.put("/changeCaseStatus",changeStatusEmployeeCase)
router.put("/addCaseComment",employeeAddCaseComment)
router.put("/updateCaseById",employeeUpdateCaseById)

router.get("/viewAllClient",employeeViewAllClient)
router.get("/viewClientById",employeeViewClientById)
router.put("/updateClient",employeeEditClient)

router.get("/viewAllPartner",employeeViewAllPartner)
router.get("/viewPartnerById",employeeViewPartnerById)
router.put("/updatePartnerProfile",employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails",employeeUpdatePartnerBankingDetails)



// for finance employee
router.post("/finance/createInvoice",employeeCreateInvoice)
router.get("/finance/viewAllInvoice",employeeViewAllInvoice)
router.get("/finance/viewInvoiceById",employeeViewInvoiceById)
router.put("/finance/editInvoiceById",employeeEditInvoice)
router.put("/finance/removeInvoiceById",employeeUnActiveInvoice)
router.get("/finance/downloadInvoiceById",employeeDownloadInvoiceById)

// for sales employee
router.post("/addPartner",saleEmployeeAddPartner)
router.post("/sale/addCase",saleEmployeeAddCase)




export default router