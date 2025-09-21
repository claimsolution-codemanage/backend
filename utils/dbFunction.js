import Case from "../models/case/case.js"
import CasePaymentDetails from "../models/casePaymentDetails.js"
import CasegroStatus from "../models/groStatus.js"
import Statement from "../models/statement.js"
import Bill from "../models/bill.js"
import Client from "../models/client.js"
import CaseOmbudsmanStatus from "../models/ombudsmanStatus.js"
import CaseDoc from "../models/caseDoc.js";
import * as helperFunc from "../utils/helper.js";


const senderDetails = {
    name: "ADAKIYA CONSULTANCY SERVICES PVT.LTD",
    address: "A-4 & 5, 3rd Floor, Rajupark, Devli Road, Near Domino's Pizza, New Delhi -110080,India",
    state: "Delhi",
    country: "IN",
    pinCode: "110062",
    gstNo: "07AAYCA7531P1ZR",
    panNo: "AAYCA7531P",
    email: "claimsolution.in@gmail.com",
    mobileNo: "011 49858616"
}

export const createOrUpdateCaseStatusForm = async (req, res, next) => {
    try {
        const { caseId, type, _id, isSettelment, approved, partnerFee, approvedAmount, consultantFee } = req.body
        const findCase = await Case.findOne({ _id: caseId, isActive: true })
        if (!findCase) return res.status(400).json({ status: 0, message: "Case is not found" })
        const findClient = await Client.findOne({ _id: findCase?.clientId }).select("fullName profile.panNo profile.primaryMobileNo profile.primaryEmail profile.aadhaarNo profile.aadhaarNo profile.address profile.district profile.city profile.state profile.pinCode")
        if (!findClient) return res.status(400).json({ status: 0, message: "Client is not found" })

        let receiverDetails = {
            name: findClient?.fullName || "",
            address: findClient?.profile?.address || "",
            state: findClient?.profile.state || "",
            country: "IN",
            pinCode: findClient?.profile?.pinCode || "",
            gstNo: "",
            panNo: findClient?.profile?.panNo || "",
            email: findClient?.profile?.primaryEmail || "",
            mobileNo: findClient?.profile?.primaryMobileNo || "",
        }

        let isExist;
        if (type && type?.toLowerCase() == "gro") {
            if (_id) {
                isExist = await CasegroStatus.findOne({ caseId, isActive: true })
                if (!isExist) return res.status(400).json({ status: 0, message: "GRO is not found" })
            } else {
                isExist = new CasegroStatus({
                    caseId, clientId: findCase?.clientId, branchId: findCase?.branchId || ""
                })
            }
            const updateKeys = ["partnerFee", "consultantFee", "groFilingDate", "groStatusUpdates", "queryHandling", "queryReply", "approvedAmount", "approvalDate", "approvalLetter"]
            const updateBooleanKeys = ["specialCase", "isSettelment", "approved", "approvalLetterPrivate"]
            updateKeys.forEach(ele => {
                if (req.body[ele]) {
                    isExist[ele] = req.body[ele]
                }
            })
            updateBooleanKeys.forEach(ele => {
                isExist[ele] = Boolean(req.body[ele]) || false
            })
        } else if (type && type?.toLowerCase() == "ombudsman") {
            if (_id) {
                isExist = await CaseOmbudsmanStatus.findOne({ caseId, isActive: true })
                if (!isExist) return res.status(400).json({ status: 0, message: "Ombudsman is not found" })
            } else {
                isExist = new CaseOmbudsmanStatus({
                    caseId, clientId: findCase?.clientId, branchId: findCase?.branchId || ""
                })
            }
            const updateKeys = ["partnerFee", "consultantFee", "filingDate", "complaintNumber", "method", "statusUpdates", "queryHandling", "queryReply", "hearingSchedule", "awardPart", "approvedAmount", "approvalDate", "approvalLetter"]
            const updateBooleanKeys = ["specialCase", "isSettelment", "approved", "approvalLetterPrivate"]
            updateKeys.forEach(ele => {
                if (req.body[ele]) {
                    isExist[ele] = req.body[ele]
                }
            })
            updateBooleanKeys.forEach(ele => {
                isExist[ele] = Boolean(req.body[ele]) || false
            })
        }

        if (isSettelment && isExist) {
            let isExistPaymentDetails = await CasePaymentDetails.findOne({ _id: isExist?.paymentDetailsId, isActive: true })

            if (!isExistPaymentDetails) {
                isExistPaymentDetails = new CasePaymentDetails({ caseId: findCase?._id, isActive: true, branchId: findCase?.branchId || "" })
            }

            const approvedAmt = req?.body?.amount ? Number(req?.body?.amount) : 0

            const updatePaymentDetailsKeys = ["paymentMode", "dateOfPayment", "utrNumber", "bankName", "chequeNumber", "chequeDate", "amount", "transactionDate"]
            updatePaymentDetailsKeys.forEach(ele => {
                if (req.body[ele]) {
                    isExistPaymentDetails[ele] = req.body[ele]
                }
            })
            await isExistPaymentDetails.save()
            isExist.paymentDetailsId = isExistPaymentDetails?._id

            if (findCase?.partnerId && partnerFee) {
                let isExistStatement = await Statement.findOne({ _id: isExist.statementId, isActive: true })
                if (!isExistStatement) {
                    isExistStatement = new Statement({ partnerId: findCase?.partnerId, isActive: true, branchId: findCase?.branchId })
                }

                const payAmt = approvedAmt * Number(partnerFee) / 100

                const updatePaymentDetailsKeys = ["caseLogin", "policyHolder", "fileNo", "policyNo", "insuranceCompanyName", "claimAmount", "approvedAmt", "constultancyFee",
                    "TDS", "modeOfLogin", "payableAmt", "utrDetails"]
                const satatmentDetails = {
                    "caseLogin": findCase?.createdAt,
                    "policyHolder": findCase?.name,
                    "fileNo": findCase?.fileNo,
                    "policyNo": findCase?.policyNo,
                    "insuranceCompanyName": findCase?.insuranceCompanyName,
                    "claimAmount": findCase?.claimAmount,
                    "approvedAmt": approvedAmt,
                    "constultancyFee": payAmt,
                    "TDS": 0,
                    "modeOfLogin": "Online",
                    "payableAmt": payAmt,
                    "utrDetails": "",
                }
                updatePaymentDetailsKeys.forEach(ele => {
                    if (satatmentDetails[ele]) {
                        isExistStatement[ele] = satatmentDetails[ele]
                    }
                })
                await isExistStatement.save()
                isExist.statementId = isExistStatement._id
            }
        }

        if (approved && isExist) {
            const billCount = await Bill.find({}).count()
            let isExistBill = await Bill.findOne({ _id: isExist?.billId, isActive: true })
            if (!isExistBill) {
                isExistBill = new Bill({
                    invoiceNo: `ACS-${billCount + 1}`, caseId,
                    clientId: findCase?.clientId,
                    branchId: findCase?.branchId || "",
                    billDate: new Date()
                })
            }
            if (!isExistBill?.isPaid) {
                let gstRate = 18
                let totalAmt = Number(approvedAmount || 0) * Number(consultantFee || 0) / 100
                let gstAmt = totalAmt * gstRate / 100 || 0
                let subAmt = totalAmt - gstAmt
                console.log("caseFee", gstAmt, subAmt, totalAmt);

                let itemDetails = {
                    name: "fee",
                    description: "consultant fee",
                    quantity: 0,
                    gstRate,
                    rate: 0,
                    gstAmt,
                    amt: subAmt,
                    totalAmt
                }
                isExistBill.sender = senderDetails
                isExistBill.receiver = receiverDetails
                isExistBill.invoiceItems = itemDetails
                isExistBill.subAmt = subAmt
                isExistBill.gstAmt = gstAmt
                isExistBill.totalAmt = totalAmt

                await isExistBill.save()
            }

            isExist.billId = isExistBill?._id
        }

        if (isExist) {
            await isExist.save()
        }
        return res.status(200).json({ status: 1, message: "Success" })
    } catch (error) {
        console.log("createOrUpdateCaseStatusForm error", error);
        return res.status(500).json({ status: 0, message: "Something wend wrong" })
    }
}

export const commonAddCaseFile = async (req, res) => {
    try {
        const { _id } = req.query
        if (!helperFunc.validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const mycase = await Case.findById(_id)
        if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })

        let bulkOps = [];
        (req?.body?.caseDocs || [])?.forEach((doc) => {
            bulkOps.push({
                insertOne: {
                    document: {
                        name: doc?.docName,
                        type: doc?.docType,
                        format: doc?.docFormat,
                        url: doc?.docURL,
                        caseId: mycase._id?.toString(),
                        clientId: req?.user?._id
                    }
                }
            });
        });
        bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

        return res.status(200).json({ success: true, message: "Successfully add case file" })
    } catch (error) {
        console.log("add case file in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}


