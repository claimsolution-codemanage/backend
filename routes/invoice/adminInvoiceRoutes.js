import express from 'express';
const router = express.Router();
import * as adminInvoiceController from '../../controller/invoice/adminInvoiceController.js'
import { authAdmin } from '../../middleware/authentication.js';

// for invoice
router.use(authAdmin)
router.post("/create", adminInvoiceController.adminCreateInvoice)
router.get("/viewAll", adminInvoiceController.adminViewAllInvoice)
router.get("/downloadAllInvoice", adminInvoiceController.adminDownloadAllInvoice)
router.get("/viewInvoiceById", adminInvoiceController.adminViewInvoiceById)
router.put("/editInvoiceById", adminInvoiceController.adminEditInvoice)
router.put("/editInvoiceNo", adminInvoiceController.adminEditInvoiceNo)
router.put("/paidInvoiceById", adminInvoiceController.adminPaidInvoice)
router.put("/unActiveInvoiceById", adminInvoiceController.adminUnActiveInvoice)
router.delete("/deleteInvoice", adminInvoiceController.adminRemoveInvoice)
router.get('/nextInvoiceNumber', adminInvoiceController.adminNextInvoiceNumber)

export default router