import express from 'express';
const router = express.Router();

import * as empInvoiceController from '../../controller/invoice/empInvoiceController.js'
import { authEmployee } from '../../middleware/authentication.js';

// for finance employee
router.use(authEmployee)
router.post("/create", empInvoiceController.employeeCreateInvoice)
router.get("/viewAll", empInvoiceController.employeeViewAllInvoice)
router.get("/viewInvoiceById", empInvoiceController.employeeViewInvoiceById)
router.put("/editInvoiceById", empInvoiceController.employeeEditInvoice)
router.put("/editInvoiceNo", empInvoiceController.employeeEditInvoiceNo)
router.put("/paidInvoiceById", empInvoiceController.empOpPaidInvoice)
router.get("/downloadAllInvoice", empInvoiceController.empDownloadAllInvoice)
router.put("/unActiveInvoiceById", empInvoiceController.employeeUnActiveInvoice)
router.get("/downloadInvoiceById", empInvoiceController.employeeDownloadInvoiceById)
router.delete("/removeInvoiceById", empInvoiceController.employeeRemoveInvoice)
router.delete("/deleteInvoiceById", empInvoiceController.deleteInvoiceById)
router.get("/nextInvoiceNumber", empInvoiceController.empNextInvoiceNumber)

export default router
