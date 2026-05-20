
import Bill from "../../../models/bill.js"

export const generateEmiInvoice = async (data) => {
    try {
        const { branchId, amount, gstPercent, caseId, clientId, client } = data

        const totalAmt = amount
        const subAmt = Number(totalAmt / (1 + gstPercent / 100)).toFixed(2)
        const gstAmt = Number(totalAmt - subAmt).toFixed(2)

        const sender = {
            "name": "ADAKIYA CONSULTANCY SERVICES PVT.LTD",
            "address": "A-4 & 5, 3rd Floor, Rajupark, Devli Road, Near Domino's Pizza, New Delhi -110080,India",
            "state": "Delhi",
            "country": "IN",
            "pinCode": "110062",
            "gstNo": "07AAYCA7531P1ZR",
            "panNo": "AAYCA7531P",
            "email": "claimsolution.in@gmail.com",
            "mobileNo": "011 49858616"
        }

        const receiver = {
            "name": client?.name,
            "address": client?.address,
            "state": client?.state,
            "country": "IN",
            "pinCode": client?.pinCode,
            "gstNo": client?.gstNo || "",
            "panNo": client?.panNo || "",
            "email": client?.email || "",
            "mobileNo": client?.mobileNo || "",
        }
        const billCount = await Bill.find({}).count()
        let payload = {
            totalAmt,
            gstAmt,
            subAmt,
            caseId,
            clientId,
            branchId,
            sender,
            receiver,
            invoiceItems: [
                {
                    description: 'File Processing Fee',
                    quantity: 1,
                    rate: subAmt,
                    gstRate: gstPercent,
                    gstAmt: gstAmt,
                    amt: totalAmt,
                    totalAmt,
                }
            ],
            paidBy: 'client',
            isOffice: false,
            invoiceNo: `ACS-${billCount + 1}`
        }
        const newInvoice = new Bill({ ...payload })
        await newInvoice.save()
        return { success: true, message: "Invoice generated successfully", invoiceNo: `ACS-${billCount + 1}` }
    } catch (error) {
        console.log("generateEmiInvoice Error:", error)
        return { success: false, message: "Failed to generate invoice" }
    }
}