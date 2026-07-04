import Bill from "../../models/bill.js";
import Case from "../../models/case/case.js";
import Client from "../../models/client.js";
import { commonInvoiceDownloadExcel, getAllInvoiceQuery, validMongooseId } from "../../utils/helper.js";
import { validateInvoice } from "../../utils/validateEmployee.js";


export const adminCreateInvoice = async (req, res) => {
    try {
        const { admin } = req
        const { clientId, caseId } = req.query

        let getClient = false
        let getCase = false
        let billRef = {}

        const { error } = validateInvoice(req.body)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        if (caseId && clientId && caseId !== "null" && clientId !== "null") {
            if (!validMongooseId(clientId) || !validMongooseId(caseId)) return res.status(400).json({ success: false, message: "caseId and clientId must be valid" })
            getClient = await Client.findById(clientId)
            if (!getClient) return res.status(400).json({ success: false, message: "Client not found" })
            getCase = await Case.findById(caseId)
            if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

            billRef = { caseId, clientId, branchId: getCase?.branchId }
        } else {
            billRef = { isOffice: true, paidBy: 'Office' }
        }

        const { invoiceNo } = req.body
        if (!invoiceNo) return res.status(400).json({ success: false, message: "Invoice no is required" })

        const isExitInvoiceNo = await Bill.exists({ invoiceNo })
        if (isExitInvoiceNo) return res.status(400).json({ success: false, message: "Invoice no already exist" })

        let payload = {
            ...req.body,
            ...billRef,
            invoiceNo: invoiceNo
        }


        const newInvoice = new Bill({ ...payload })
        await newInvoice.save()
        return res.status(200).json({ success: true, message: "Successfully create invoice", _id: newInvoice?._id });
    } catch (error) {
        console.log("admin-create invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminViewAllInvoice = async (req, res) => {
    try {
        const { admin } = req

        const pageItemLimit = req.query.limit ? req.query.limit : 10;
        const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
        const searchQuery = req.query.search ? req.query.search : "";
        const startDate = req.query.startDate ? req.query.startDate : "";
        const endDate = req.query.endDate ? req.query.endDate : "";
        const type = req?.query?.type

        const query = getAllInvoiceQuery(searchQuery, startDate, endDate, false, type)
        if (!query.success) return res.status(400).json({ success: false, message: query.message })
        const aggregationPipeline = [
            { $match: query.query }, // Match the documents based on the query
            {
                $group: {
                    _id: null,
                    totalAmtSum: { $sum: "$totalAmt" } // Calculate the sum of totalAmt
                }
            }
        ];

        const getAllBill = await Bill.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("transactionId");
        const noOfBill = await Bill.find(query?.query).count()
        const aggregateResult = await Bill.aggregate(aggregationPipeline);
        return res.status(200).json({ success: true, message: "get case data", data: getAllBill, noOf: noOfBill, totalAmt: aggregateResult });

    } catch (error) {
        console.log("admin-get invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminDownloadAllInvoice = async (req, res) => {
    try {
        const { admin } = req
        const searchQuery = req.query.search ? req.query.search : "";
        const startDate = req.query.startDate ? req.query.startDate : "";
        const endDate = req.query.endDate ? req.query.endDate : "";
        const type = req?.query?.type

        const query = getAllInvoiceQuery(searchQuery, startDate, endDate, false, type, false)
        if (!query.success) return res.status(400).json({ success: false, message: query.message })

        const getAllBill = await Bill.find(query?.query).populate("transactionId", "paymentMode");

        const excelBuffer = await commonInvoiceDownloadExcel(getAllBill)

        res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.status(200)
        res.send(excelBuffer)
    } catch (error) {
        console.log("employee-get invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminViewInvoiceById = async (req, res) => {
    try {
        const { admin } = req

        const { _id } = req.query;
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const getInvoice = await Bill.findById(_id)
        if (!getInvoice) return res.status(404).json({ success: false, message: "Invoice not found" })
        return res.status(200).json({ success: true, message: "get invoice by id data", data: getInvoice });

    } catch (error) {
        console.log("employeeViewPartnerById in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const adminEditInvoice = async (req, res) => {
    try {
        const { admin } = req
        const { _id } = req.query;
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const { error } = validateInvoice(req.body)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        const { invoiceNo } = req.body
        const getInvoice = await Bill.findById(_id)

        if (!getInvoice) return res.status(400).json({ success: false, message: "Invoice not found" })
        if (!invoiceNo) return res.status(400).json({ success: false, message: "Invoice no is required" })

        if (getInvoice?.invoiceNo?.toLowerCase()?.trim() != invoiceNo?.toLowerCase()?.trim()) {
            const isExitInvoiceNo = await Bill.findOne({ invoiceNo, _id: { $ne: _id } })
            if (isExitInvoiceNo) return res.status(400).json({ success: false, message: "Invoice no already exist" })
        }

        if (!getInvoice?.isPaid) {
            const invoice = await Bill.findByIdAndUpdate(_id, { $set: req?.body })
            return res.status(200).json({ success: true, message: "Successfully update invoice" });
        } else {
            return res.status(400).json({ success: true, message: "Paid invoice not be editable" });
        }
    } catch (error) {
        console.log("admin-create invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}


export const adminEditInvoiceNo = async (req, res) => {
    try {
        const { admin } = req
        const { _id, invoiceNo } = req.body;
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        if (!invoiceNo) return res.status(400).json({ success: false, message: "Invoice no is required" })

        const isExist = await Bill.findById(_id)
        if (!isExist) return res.status(400).json({ success: true, message: "Invoice not found" });

        if (isExist?.invoiceNo?.toLowerCase()?.trim() != invoiceNo?.toLowerCase()?.trim()) {
            const isExitInvoiceNo = await Bill.findOne({ invoiceNo, _id: { $ne: _id } })
            if (isExitInvoiceNo) return res.status(400).json({ success: false, message: "Invoice no already exist" })
        }
        isExist.invoiceNo = invoiceNo
        await isExist.save()
        return res.status(200).json({ success: true, message: "Successfully update invoice no" });
    } catch (error) {
        console.log("invoice no in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminPaidInvoice = async (req, res) => {
    try {
        const { admin } = req
        const { _id } = req.body;
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const { remark = "", status } = req.body
        if (!status) return res.status(400).json({ success: false, message: "Status is required" })

        const invoice = await Bill.findByIdAndUpdate(_id, { $set: { remark: remark, isPaid: status == "paid" ? true : false, paidBy: "admin", paidDate: new Date() } })
        if (!invoice) return res.status(404).json({ success: true, message: "Details not found" });
        return res.status(200).json({ success: true, message: "Successfully update invoice" });

    } catch (error) {
        console.log("admin-Paid-Invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminUnActiveInvoice = async (req, res) => {
    try {
        const { admin } = req
        const { _id, type } = req.query;
        console.log("type1", type);
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const invoice = await Bill.findByIdAndUpdate(_id, { $set: { isActive: type } })

        return res.status(200).json({ success: true, message: `Successfully ${type == "true" ? "restore" : "remove"} invoice` });
    } catch (error) {
        console.log("admin-remove invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}


export const adminRemoveInvoice = async (req, res) => {
    try {
        const { admin } = req

        const { _id, type } = req.query;
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const invoice = await Bill.findByIdAndDelete(_id)

        return res.status(200).json({ success: true, message: `Successfully delete invoice` });
    } catch (error) {
        console.log("admin-delete invoice in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

// next invoice number
export const adminNextInvoiceNumber = async (req, res) => {
    try {

        // next invoice number
        const lastInvoiceNumber = await Bill.countDocuments({ invoiceNo: { $exists: true, $ne: null } })
        return res.status(200).json({ success: true, message: "Successfully get next invoice number", data: { number: lastInvoiceNumber + 1 } });
    } catch (error) {
        console.log("admin-next invoice number in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}