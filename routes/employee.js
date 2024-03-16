import express from 'express';
const router = express.Router();
import { employeeResetPassword,employeeSignin,changeStatusEmployeeCase,viewAllEmployeeCase, employeeViewCaseByIdBy,
employeeViewAllClient,employeeViewClientById,employeeViewAllPartner,employeeViewPartnerById,employeeForgetPassword,
employeeAuthenticate,employeeAddCaseComment,employeeResetForgetPassword,
employeeCreateInvoice,employeeViewAllInvoice,employeeViewInvoiceById,employeeDownloadInvoiceById,
employeeEditInvoice,allEmployeeDashboard,employeeUnActiveInvoice,employeeUpdateCaseById,
employeeEditClient,employeeupdateParnterProfile,employeeUpdatePartnerBankingDetails
} from '../controller/employee.js';


router.post("/signin",employeeSignin)
router.get("/authenticate",employeeAuthenticate)
router.post("/resetPassword",employeeResetPassword)
router.put("/changeCaseStatus",changeStatusEmployeeCase)
router.get("/viewAllCase",viewAllEmployeeCase)
router.get("/viewCaseById",employeeViewCaseByIdBy)
router.get("/viewAllClient",employeeViewAllClient)
router.get("/viewClientById",employeeViewClientById)
router.get("/viewAllPartner",employeeViewAllPartner)
router.get("/viewPartnerById",employeeViewPartnerById)

router.put("/employeeForgetPassword",employeeForgetPassword)
router.put("/resetForgetPassword",employeeResetForgetPassword)
router.put("/addCaseComment",employeeAddCaseComment)

router.put("/updateCaseById",employeeUpdateCaseById)
router.put("/updateClient",employeeEditClient)
router.put("/updatePartnerProfile",employeeupdateParnterProfile)
router.put("/updatePartnerBankingDetails",employeeUpdatePartnerBankingDetails)

router.post("/finance/createInvoice",employeeCreateInvoice)
router.get("/finance/viewAllInvoice",employeeViewAllInvoice)
router.get("/finance/viewInvoiceById",employeeViewInvoiceById)
router.put("/finance/editInvoiceById",employeeEditInvoice)
router.put("/finance/removeInvoiceById",employeeUnActiveInvoice)
router.get("/finance/downloadInvoiceById",employeeDownloadInvoiceById)
router.get("/all/dashboard",allEmployeeDashboard)



export default router