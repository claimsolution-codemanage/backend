import axios from "axios";
import path from 'path'
import mongoose, { Types } from "mongoose";
import CaseDoc from "../../models/caseDoc.js";
import { getValidateDate, sendNotificationAndMail, validMongooseId } from "../../utils/helper.js";
import Case from "../../models/case/case.js";
import { caseUpdateStatusTemplate } from "../../utils/emailTemplates/caseUpdateStatusTemplate.js";
import { sendMail } from "../../utils/sendMail.js";
import CaseStatus from "../../models/caseStatus.js";
import { validateAdminAddCaseFee, validateAdminAddEmployeeToCase, validateAdminUpdateCasePayment, validateEditAdminCaseStatus, validateUpdateAdminCase } from "../../utils/validateAdmin.js";
import * as dbFunction from "../../utils/dbFunction.js"
import { validateAddClientCase } from "../../utils/validateClient.js";
import CasePaymentDetails from "../../models/casePaymentDetails.js";
import CaseMergeDetails from "../../models/caseMergeDetails.js";
import CaseComment from "../../models/caseComment.js";
import Partner from "../../models/partner.js";
import Employee from "../../models/employee/employeeModel.js";
import ShareSection from "../../models/shareSection.js";


export const viewAllAdminCase = async (req, res) => {
    try {
        let { limit = 10, pageNo = 1, search = "", status = "", startDate = "", endDate = "", empId = "", type, isReject = "", isWeeklyFollowUp = false, isClosed = false } = req.query
        const skip = (pageNo - 1) * limit;

        let matchQuery = []
        if (startDate && endDate) {
            const validStartDate = getValidateDate(startDate)
            if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
            const validEndDate = getValidateDate(endDate)
            if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
        }


        matchQuery.push({ isActive: type == "true" ? true : false })
        matchQuery.push(isReject == "true" ? { currentStatus: { $in: ["Reject"] } } : { currentStatus: { $nin: ["Reject"] } })
        matchQuery.push(isClosed == "true" ? { currentStatus: { $in: ["Closed"] } } : { currentStatus: { $nin: ["Closed"] } })
        isWeeklyFollowUp == "true" && matchQuery.push({ currentStatus: { $nin: ["Closed", "Reject"] } })

        //  date-wise filter
        if (startDate && endDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            matchQuery.push({
                createdAt: {
                    $gte: new Date(start),
                    $lte: new Date(end)
                }
            });
        }


        const pipeline = [
            {
                "$match": {
                    "$and": [
                        { "isPartnerReferenceCase": false },
                        { "isEmpSaleReferenceCase": false },
                        { "currentStatus": { "$regex": status, "$options": "i" } },
                        ...matchQuery,
                    ]
                }
            },
            {
                "$project": {
                    "clientId": 1,
                    "consultantCode": 1,
                    "branchId": 1,
                    "partnerId": 1,
                    "partnerCode": 1,
                    "empSaleId": 1,
                    "isActive": 1,
                    "caseFrom": 1,
                    "name": 1,
                    "mobileNo": 1,
                    "email": 1,
                    "claimAmount": 1,
                    "policyNo": 1,
                    "fileNo": 1,
                    "policyType": 1,
                    "complaintType": 1,
                    "createdAt": 1,
                    "currentStatus": 1,
                    "empObjId": 1,
                    "partnerObjId": 1,
                    "clientObjId": 1,
                    "nextFollowUp": 1,
                    "lastStatusDate": 1
                }
            },
            {
                "$lookup": {
                    "from": 'partners',
                    "localField": "partnerObjId",
                    "foreignField": "_id",
                    "pipeline": [
                        {
                            "$project": {
                                "fullName": 1, // Include only the fullName field,
                                "profile.consultantName": 1,
                                "profile.consultantCode": 1,
                            }
                        }
                    ],
                    "as": 'partnerDetails'
                }
            },
            {
                '$unwind': {
                    'path': '$partnerDetails',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                "$lookup": {
                    "from": 'clients',
                    "localField": "clientObjId",
                    "foreignField": "_id",
                    "pipeline": [
                        {
                            "$project": {
                                "fullName": 1, // Include only the fullName field
                                "profile.consultantName": 1,
                                "profile.consultantCode": 1,
                            }
                        }
                    ],
                    "as": 'clientDetails'
                }
            },
            {
                '$unwind': {
                    'path': '$clientDetails',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                "$lookup": {
                    "from": 'employees',
                    "localField": "empObjId",
                    "foreignField": "_id",
                    "as": 'employeeDetails',
                    "pipeline": [
                        {
                            "$project": {
                                "fullName": 1, // Include only the fullName field
                                "designation": 1,
                                "type": 1
                            }
                        }
                    ]
                }
            },
            {
                '$unwind': {
                    'path': '$employeeDetails',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                '$match': {
                    '$or': [
                        { "name": { "$regex": search, "$options": "i" } },
                        { 'partnerDetails.fullName': { "$regex": search, "$options": "i" } },
                        { 'employeeDetails.fullName': { "$regex": search, "$options": "i" } },
                        { "consultantCode": { "$regex": search, "$options": "i" } },
                        { "fileNo": { "$regex": search, "$options": "i" } },
                        { "email": { "$regex": search, "$options": "i" } },
                        { "mobileNo": { "$regex": search, "$options": "i" } },
                        { "policyType": { "$regex": search, "$options": "i" } },
                        { "policyNo": { "$regex": search, "$options": "i" } },
                        { "caseFrom": { "$regex": search, "$options": "i" } },
                        { "branchId": { "$regex": search, "$options": "i" } },
                    ]
                }
            },
            ...(isWeeklyFollowUp == "true" ? [
                {
                    $match: {
                        nextFollowUp: {
                            $ne: null,
                            // $lte: new Date()
                        }
                    }
                }
            ] : []),
            ...(isWeeklyFollowUp == "true"
                ? [{ '$sort': { 'nextFollowUp': 1 } }]
                : [{ '$sort': { 'createdAt': -1 } }]),
            {
                "$facet": {
                    "cases": [
                        { "$skip": Number(skip) },
                        { "$limit": Number(limit) },
                    ],
                    "totalCount": [
                        { "$count": "count" }
                    ],
                    "totalAmt": [
                        {
                            "$group": {
                                "_id": null,
                                "totalAmtSum": { "$sum": "$claimAmount" }
                            }
                        }
                    ]
                }
            }
        ];

        const result = await Case.aggregate(pipeline);
        const getAllCase = result[0].cases;
        const noOfCase = result[0].totalCount[0]?.count || 0;
        const totalAmount = result?.[0]?.totalAmt
        return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount });

    } catch (error) {
        console.log("updateAdminCase in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const changeStatusAdminCase = async (req, res) => {
    try {
        const { admin } = req
        const { error } = validateUpdateAdminCase(req.body)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        const { notify = "", nextFollowUp = "", otherDetails = {} } = req.body

        if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })
        const statusRemark = req.body.remark
        const caseStatus = req.body.status

        const updateCase = await Case.findById(req.body._id).populate("partnerObjId", "profile.consultantName profile.primaryEmail").populate("clientObjId", "profile.consultantName profile.primaryEmail")
        if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
        updateCase.currentStatus = req.body.status
        updateCase.nextFollowUp = nextFollowUp || null
        updateCase.lastStatusDate = new Date()
        await updateCase.save()

        const addNewStatus = new CaseStatus({
            remark: statusRemark,
            status: caseStatus,
            consultant: admin?.fullName,
            adminId: req?.user?._id,
            attachments: req.body.attachments || [],
            otherDetails: otherDetails ? { ...otherDetails, nextFollowUp: nextFollowUp || "" } : {},
            notify: req.body.notify || "",
            caseId: req.body._id
        })
        await addNewStatus.save()

        let formattedAttachments = []
        if (req.body.attachments && req.body.attachments.length > 0) {
            const attachmentArray = req.body.attachments
            if (Array.isArray(attachmentArray)) {
                for (let attachment of attachmentArray) {
                    let filename = path.basename(attachment)?.split("?")?.[0]?.split("_")?.[1]
                    if (!filename) {
                        filename = `Attachment_${updateCase.fileNo}_${attachmentArray.indexOf(attachment) + 1}`
                    }
                    formattedAttachments.push({
                        filename: filename,
                        path: attachment,
                    })
                }
            }
        }

        const subject = "Update on Your Case – Status Changed"
        // client
        if (updateCase?.clientObjId?.profile?.primaryEmail && (["client", "both"]?.includes(notify?.toLowerCase()))) {
            sendMail({
                to: updateCase?.clientObjId?.profile?.primaryEmail,
                subject,
                html: caseUpdateStatusTemplate({ type: "Client", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/client/view case/${req.body._id}` }),
                ...(formattedAttachments?.length > 0 && { attachments: formattedAttachments })
            })
        }
        // partner
        if (updateCase?.partnerObjId?.profile?.primaryEmail && (["partner", "both"]?.includes(notify?.toLowerCase()))) {
            sendMail({
                to: updateCase?.partnerObjId?.profile?.primaryEmail,
                subject,
                html: caseUpdateStatusTemplate({ type: "Partner", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/partner/view case/${req.body._id}` }),
                ...(formattedAttachments?.length > 0 && { attachments: formattedAttachments })
            })
        }
        return res.status(200).json({ success: true, message: `Case status change to ${req.body.status}` });
    } catch (error) {
        console.log("updateAdminCase in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const viewCaseByIdByAdmin = async (req, res) => {
    try {
        const { _id } = req.query;

        if (!validMongooseId(_id)) {
            return res.status(400).json({ success: false, message: "Invalid case id" });
        }

        const [caseData] = await Case.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(_id) } },
            {
                $lookup: {
                    from: "clients",
                    localField: "clientObjId",
                    foreignField: "_id",
                    as: "clientDetails",
                    pipeline: [
                        { $project: { "profile.consultantCode": 1, "profile.consultantName": 1 } }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$clientDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "partners",
                    localField: "partnerObjId",
                    foreignField: "_id",
                    as: "partnerDetails",
                    pipeline: [
                        { $project: { "profile.consultantCode": 1, "profile.consultantName": 1 } }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$partnerDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "empObjId",
                    foreignField: "_id",
                    as: "empDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                type: 1,
                                designation: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: { path: "$empDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "casepaymentdetails",
                    let: { caseId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $eq: ["$isActive", true] }, { $eq: ["$caseId", "$$caseId"] }] } } }
                    ],
                    as: "casePayment"
                }
            },
            {
                $project: {
                    addEmployee: 0
                }
            },
            {
                $lookup: {
                    from: "case_forms",
                    localField: "_id",
                    foreignField: "caseId",
                    pipeline: [
                        { $match: { isActive: true } },
                        { $project: { formType: 1, caseId: 1 } },
                    ],
                    as: "case_forms"
                }
            },
            {
                $lookup: {
                    from: "cases",
                    let: {
                        clientId: "$clientObjId",
                        caseId: "$_id",
                        branchId: "$branchId"
                    },
                    as: "clientOtherCases",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $cond: {
                                        if: {
                                            $or: [
                                                { $eq: ["$$clientId", null] },
                                                { $not: ["$$clientId"] }
                                            ]
                                        },
                                        then: false,
                                        else: {
                                            $and: [
                                                { $eq: ["$clientObjId", "$$clientId"] },
                                                { $eq: ["$branchId", "$$branchId"] },
                                                { $ne: ["$_id", "$$caseId"] }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                currentStatus: 1,
                                policyNo: 1,
                                fileNo: 1,
                                createdAt: 1,
                                clientObjId: 1
                            }
                        }
                    ]
                }
            },

        ]);

        if (!caseData) {
            return res.status(404).json({ success: false, message: "Case not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Case data fetched successfully",
            data: caseData
        });

    } catch (error) {
        console.error("viewCaseByIdByAdmin error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const viewCaseDocsById = async (req, res) => {
    try {
        const { _id } = req.params;

        if (!validMongooseId(_id)) {
            return res.status(400).json({ success: false, message: "Not a valid id" });
        }

        const caseId = new Types.ObjectId(_id);

        const query = {
            isActive: true,
            $or: [
                { caseId: caseId },
                { caseMargeId: _id.toString() }
            ]
        };

        const docs = await CaseDoc.find(query).select("name type format url date isPrivate createdAt");

        return res.status(200).json({ success: true, message: "get case docs data", data: docs });
    } catch (error) {
        console.error("viewCaseDocsById error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error });
    }
};

export const viewCaseProcessStepsById = async (req, res) => {
    try {
        const { _id } = req.params;

        if (!validMongooseId(_id)) {
            return res.status(400).json({ success: false, message: "Not a valid id" });
        }

        const caseId = new Types.ObjectId(_id);

        const query = {
            isActive: true,
            $or: [
                { caseId: caseId },
                { caseMargeId: _id.toString() }
            ]
        };

        const steps = await CaseStatus.find(query).select("status createdAt remark date attachments notify otherDetails").sort({ createdAt: -1 });

        return res.status(200).json({ success: true, message: "get case process steps data", data: steps });
    } catch (error) {
        console.error("viewCaseProcessStepsById error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error });
    }
};

export const adminAddCaseFile = async (req, res) => {
    try {
        await dbFunction.commonAddCaseFile(req, res, "adminId")
    } catch (error) {
        console.log("add case file in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminUpdateCaseById = async (req, res) => {
    try {
        const { _id } = req.query
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const { error } = validateAddClientCase(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body } }, { new: true })
        if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })

        return res.status(200).json({ success: true, message: "Successfully update case", data: updateCase });

    } catch (error) {
        console.log("updateAdminCase in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const adminAddOrUpdatePayment = async (req, res) => {
    try {
        const { admin } = req
        const { _id, paymentMode, caseId } = req.body

        if (!caseId) return res.status(400).json({ success: false, message: "CaseId is required" })
        const findCase = await Case.findOne({ _id: caseId, isActive: true })
        if (!findCase) return res.status(400).json({ success: false, message: "Case is not found" })

        let isExist
        if (_id) {
            isExist = await CasePaymentDetails.findById(_id)
            if (!isExist) return res.status(400).json({ success: false, message: "Payment details is not found" })
        } else {
            isExist = new CasePaymentDetails({
                caseId
            })
        }

        const updateKey = [
            "dateOfPayment", "utrNumber", "bankName", "chequeNumber",
            "chequeDate", "amount", "transactionDate", "paymentMode", "attachments"
        ]

        updateKey.forEach(ele => {
            if (req.body[ele]) {
                isExist[ele] = req.body[ele]
            }
        })

        await isExist.save()

        return res.status(200).json({ success: true, message: "Success" });
    } catch (error) {
        console.log("AdminAddCaseCommit in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}


export const adminEditCaseStatus = async (req, res) => {
    try {
        const { admin } = req

        const { error } = validateEditAdminCaseStatus(req.body)
        console.log("error in adminEditCaseStatus", error);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        if (!validMongooseId(req.body.caseId) || !validMongooseId(req.body.processId)) return res.status(400).json({ success: false, message: "Not a valid processId or caseId" })

        const updateCase = await Case.findByIdAndUpdate(req.body.caseId, {
            $set: {
                ...(req.body.isCurrentStatus ? { currentStatus: req.body.status, nextFollowUp: req.body.nextFollowUp || null } : {}),
            }
        },
            { new: true },)
        if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
        await CaseStatus.findByIdAndUpdate(req.body?.processId, {
            $set: {
                status: req.body.status,
                remark: req.body.remark,
                nextFollowUp: req.body.nextFollowUp || null,
                otherDetails: req.body.otherDetails ? { ...req.body.otherDetails, nextFollowUp: req.body.nextFollowUp || "" } : {},
                notify: req.body.notify || "",
                consultant: admin?.fullName,
                adminId: req?.user?._id
            }
        })

        return res.status(200).json({ success: true, message: "Successfully update case process" });
    } catch (error) {
        console.log("updateAdminCaseProcess in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const adminAddCaseFeeClient = async (req, res) => {
    try {
        const { admin } = req
        const { _id } = req.query
        if (!_id) return res.status(400).json({ success: false, message: "required case id" })

        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const { error } = validateAdminAddCaseFee(req.body)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        req.body.mode = ""
        req.body.collectBy = ""
        req.body.onDate = ""
        req.body.orderId = ""
        req.body.referenceId = ""
        req.body.verify = "false"
        req.body.completed = false
        const updateCase = await Case.findByIdAndUpdate(_id, { $push: { paymentDetails: req.body } }, { new: true })
        if (!updateCase) return res.status(401).json({ success: false, message: "Case not found" })


        return res.status(200).json({ success: true, message: "Successfully Add payment" });
    } catch (error) {
        console.log("adminSetCaseFee in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminUpdateClientCaseFee = async (req, res) => {
    try {
        const { admin } = req

        const { error } = validateAdminUpdateCasePayment(req.query)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        if (!validMongooseId(req.query._id)) return res.status(400).json({ success: false, message: "Not a valid id" })
        if (!validMongooseId(req.query.paymentId)) return res.status(400).json({ success: false, message: "Not a valid paymentId" })


        const updateCase = await Case.findOneAndUpdate({ _id: req.query._id, "paymentDetails._id": req.query.paymentId },
            {
                $set: {
                    "paymentDetails.$.mode": req.query.paymentMode,
                    "paymentDetails.$.collectBy": req?.user?.fullName,
                    "paymentDetails.$.onDate": new Date(),
                    "paymentDetails.$.completed": true,

                }
            }, { new: true })
        if (!updateCase) return res.status(401).json({ success: false, message: "Admin account not found" })


        return res.status(200).json({ success: true, message: "Successfully update case payment" });
    } catch (error) {
        console.log("adminSetCaseFee in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminSetIsActiveCase = async (req, res) => {
    try {
        const { admin } = req

        const { _id, status } = req.query
        if (!_id || !status) return res.status(400).json({ success: false, message: "required case id and status" })

        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
        const updateCase = await Case.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
        if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })

        return res.status(200).json({ success: true, message: `Now case ${updateCase?.isActive ? "Active" : "Unactive"}` });
    } catch (error) {
        console.log("adminSetIsActiveCase in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminAddReferenceCaseAndMarge = async (req, res) => {
    try {
        const { admin } = req
        const { partnerId, partnerCaseId, empSaleId, empSaleCaseId, clientCaseId } = req?.query

        if (!validMongooseId(clientCaseId)) return res.status(400).json({ success: false, message: "Not a valid clientCaseId" })

        if (!partnerId && !empSaleId) return res.status(400).json({ success: false, message: "For add case refernce must provide partnerId or employeeId" })
        if (!validMongooseId(partnerId) && !validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid partnerId/ empSaleId" })
        if (!validMongooseId(partnerCaseId) && !validMongooseId(empSaleCaseId)) return res.status(400).json({ success: false, message: "Not a valid merge caseId" })

        let Model
        if (partnerId) Model = Partner
        if (empSaleId) Model = Employee
        const findModel = await Model.findById(partnerId || empSaleId)
        if (!findModel) return res.status(404).json({ success: false, message: `${partnerId ? "Partner" : "Employee"} Not found` })

        const isExistMergeTo = await Case.findById(partnerCaseId || empSaleCaseId).select("policyNo branchId empObjId partnerObjId email")
        if (!isExistMergeTo) return res.status(404).json({ success: false, message: "Partner case Not found" })


        const getClientCase = await Case.findById(clientCaseId).select("policyNo branchId empObjId partnerObjId clientObjId email")
        if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })

        if (isExistMergeTo?.branchId?.trim()?.toLowerCase() != getClientCase?.branchId?.trim()?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

        if (isExistMergeTo?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || isExistMergeTo?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
            return res.status(404).json({ success: false, message: "Both case must have same policyNo and emailId" })
        }

        if ((partnerId && getClientCase?.isPartnerReferenceCase) || (empSaleId && getClientCase?.isEmpSaleReferenceCase)) {
            return res.status(404).json({ success: false, message: `Case already have the ${partnerId ? "partner" : "employee"} case reference` })
        }

        let mergeParmeter = {}
        let bulkOps = []

        if (isExistMergeTo?.partnerObjId) {
            mergeParmeter["partnerObjId"] = isExistMergeTo?.partnerObjId
            bulkOps.push({
                insertOne: {
                    document: {
                        mergeCaseId: isExistMergeTo?._id,
                        caseId: getClientCase?._id,
                        partnerId: isExistMergeTo?.partnerObjId,
                        // byEmpId: employee?._id
                    }
                }
            })
        }

        if (isExistMergeTo?.empObjId) {
            mergeParmeter["empObjId"] = isExistMergeTo?.empObjId
            bulkOps.push({
                insertOne: {
                    document: {
                        mergeCaseId: isExistMergeTo?._id,
                        caseId: getClientCase?._id,
                        empId: isExistMergeTo?.empObjId,
                        // byEmpId: employee?._id
                    }
                }
            })
        }

        await Promise.all([
            CaseMergeDetails.bulkWrite(bulkOps),
            Case.findByIdAndUpdate(getClientCase?._id, { $set: { ...mergeParmeter } }, { new: true }),
            Case.findByIdAndUpdate(isExistMergeTo?._id, { $set: partnerId ? { isPartnerReferenceCase: true, } : { isEmpSaleReferenceCase: true } }),
            CaseDoc.updateMany({ caseId: partnerCaseId || empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true }),
            CaseStatus.updateMany({ caseId: partnerCaseId || empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true }),
            CaseComment.updateMany({ caseId: partnerCaseId || empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
        ])
        return res.status(200).json({ success: true, message: "Successfully add case reference ", });

    } catch (error) {
        console.log("adminAddRefenceCaseAndMarge in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminRemoveReferenceCase = async (req, res) => {
    try {
        const { admin } = req

        const { type, _id } = req?.query
        if (!type) return res.status(400).json({ success: false, message: "Please select the type of reference to remove" })
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid CaseId" })

        const getClientCase = await Case.findById(_id)
        if (!getClientCase) return res.status(404).json({ success: false, message: "Case not found" })

        let filterOptions = { isActive: true }
        let updateMergeParameter = type?.toLowerCase() == "partner" ? { isPartnerReferenceCase: false, } : { isEmpSaleReferenceCase: false }
        let updateClientCaseParameter = type?.toLowerCase() == "partner" ? { partnerObjId: "" } : { empObjId: "" }
        if (type?.toLowerCase() == "partner") {
            filterOptions.partnerId = getClientCase?.partnerObjId
        } else if (type?.toLowerCase() == "sale-emp") {
            filterOptions.empId = getClientCase?.empObjId
        } else {
            return res.status(400).json({ success: false, message: "Not a valid type" })
        }

        filterOptions.caseId = getClientCase?._id
        const mergeCase = await CaseMergeDetails.findOne(filterOptions).select("mergeCaseId")
        if (!mergeCase) return res.status(404).json({ success: false, message: "Merge case not found" })

        await Promise.all([
            Case.findByIdAndUpdate(mergeCase?.mergeCaseId, { $set: updateMergeParameter }, { new: true }), // remove ref. from merge case of partner /emp
            Case.findByIdAndUpdate(getClientCase?._id, { $unset: updateClientCaseParameter }, { new: true }), // remove partnerObjId / empObjId
            CaseMergeDetails.findByIdAndDelete(mergeCase?._id), // delete merge details
            CaseDoc.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } }),
            CaseStatus.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } }),
            CaseComment.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } }),
        ])
        return res.status(200).json({ success: true, message: "Successfully remove reference case" })
    } catch (error) {
        console.log("adminRemoveRefenceCase in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminDeleteCaseById = async (req, res) => {
    try {
        const { admin } = req
        const { caseId } = req?.query
        if (!caseId) return res.status(400).json({ success: false, message: "caseId id required" })
        if (!validMongooseId(caseId)) return res.status(400).json({ success: false, message: "Not a valid caseId" })

        const deleteCaseById = await Case.findByIdAndDelete(caseId);
        if (!deleteCaseById) return res.status(404).json({ success: false, message: "Case not found" })

        return res.status(200).json({ success: true, message: "Successfully case deleted" });
    } catch (error) {
        console.log("adminDeleteCaseById in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const adminDeleteCaseDocById = async (req, res) => {
    try {
        const { admin } = req

        const { _id } = req?.query
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid  docId" })

        const getCase = await CaseDoc.findById(_id);
        if (!getCase) return res.status(404).json({ success: false, message: "Case-doc not found" })

        const docUrl = getCase?.url?.toString()
        if (docUrl) {
            if (docUrl?.includes("https://firebasestorage.googleapis.com/")) {
                const parts = docUrl.split('/');
                const encodedFilename = parts[parts.length - 1];
                const endParts = encodedFilename?.split("?")?.[0]
                const decodedFilename = decodeURIComponent(endParts);
                if (decodedFilename) {
                    const file = bucket.file(decodedFilename);
                    await file.delete()
                }

            } else {
                const setAdminHeaders = {
                    "x-auth-token": req?.headers["x-auth-token"]
                };

                const requestBody = {
                    files: [docUrl]
                };

                const docRes = await axios.delete(
                    `${process.env.STORAGE_URL}/api/storage/deleteSelectedFiles`,
                    {
                        headers: setAdminHeaders,
                        data: requestBody
                    }
                );
            }
        }

        await CaseDoc.findByIdAndDelete(_id)
        return res.status(200).json({ success: true, message: "Successfully case-doc deleted" });
    } catch (error) {
        console.log("adminDeleteCaseDocById in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

// rename doc folder
export const renameCaseDocFolder = async (req, res) => {
    try {
        const { admin } = req

        const { documentIds, newFolderName } = req?.body
        if (!documentIds || documentIds?.length == 0) return res.status(400).json({ success: false, message: "documentIds required" })
        if (!newFolderName || newFolderName?.trim() == "") return res.status(400).json({ success: false, message: "newFolderName required" })

        const validIds = []
        for (let id of documentIds) {
            if (validMongooseId(id)) validIds.push(new Types.ObjectId(id))
        }
        if (validIds.length == 0) return res.status(400).json({ success: false, message: "No valid documentIds found" })

        await CaseDoc.updateMany({ _id: { $in: validIds } }, { $set: { name: newFolderName } })

        return res.status(200).json({ success: true, message: "Successfully case-doc renamed" });
    } catch (error) {
        console.log("renameCaseDocFolder in error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error: error });
    }
}


// comment
export const viewCaseCommentsById = async (req, res) => {
    try {
        const { caseId } = req.params;

        if (!validMongooseId(caseId)) {
            return res.status(400).json({
                success: false,
                message: "Not a valid id"
            });
        }

        const caseObjectId = new Types.ObjectId(caseId);

        const matchStage = {
            isActive: true,
            $or: [
                {
                    caseId: caseObjectId
                },
                {
                    caseMargeId: caseId.toString()
                }
            ]
        };


        const pipeline = [
            {
                $match: matchStage
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "employeeId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                type: 1
                            }
                        }
                    ],
                    as: "employee"
                }
            },
            {
                $lookup: {
                    from: "admins",
                    localField: "adminId",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullName: 1
                            }
                        }
                    ],
                    as: "admin"
                }
            },

            // ---------------------------------------------------
            // 4. Get tagged employees
            // ---------------------------------------------------
            {
                $lookup: {
                    from: "employees",
                    let: {
                        tagEmployeeIds: "$tagEmployeeIds"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: [
                                        "$_id",
                                        {
                                            $ifNull: ["$$tagEmployeeIds", []]
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                type: 1
                            }
                        }
                    ],
                    as: "tagEmployees"
                }
            },

            // ---------------------------------------------------
            // 5. Convert lookup arrays to objects
            // ---------------------------------------------------
            {
                $set: {
                    name: {
                        $ifNull: [
                            { $arrayElemAt: ["$employee.fullName", 0] },
                            { $arrayElemAt: ["$admin.fullName", 0] }
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    role: 1,
                    message: 1,
                    employeeId: 1,
                    adminId: 1,
                    tagEmployees: 1,
                    attachments: 1,
                    isPrivate: 1,
                    createdAt: 1,

                }
            },

            // ---------------------------------------------------
            // 6. Sort comments
            // ---------------------------------------------------
            {
                $sort: {
                    createdAt: 1
                }
            }
        ];

        const comments = await CaseComment.aggregate(pipeline);

        return res.status(200).json({
            success: true,
            message: "get case comments data",
            data: comments
        });

    } catch (error) {
        console.error("viewCaseCommentsById error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error
        });
    }
};

export const adminAddOrUpdateCaseComment = async (req, res) => {
    try {
        const { admin } = req
        const { comment, caseCommentId, isPrivate, attachments, tagEmployeeIds = [] } = req.body
        if (!comment?.trim()) return res.status(400).json({ success: false, message: "Case Comment required" })
        if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })
        if (caseCommentId && !validMongooseId(caseCommentId)) return res.status(400).json({ success: false, message: "Not a valid comment ID" })

        if (!Array.isArray(tagEmployeeIds)) return res.status(400).json({ success: false, message: "Not a valid tag employee ID" })
        if (tagEmployeeIds?.length) {
            await Promise.all(tagEmployeeIds?.map(async (tagEmployeeId) => {
                if (!validMongooseId(tagEmployeeId)) return res.status(400).json({ success: false, message: "Not a valid tag employee ID" })
            }))
        }

        const getCase = await Case.findById(req.body._id,)
        if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

        if (caseCommentId) {
            await CaseComment.findByIdAndUpdate(caseCommentId, {
                $set: {
                    message: comment?.trim(),
                    isPrivate: isPrivate ?? false,
                    adminId: req?.user?._id,
                    attachments: attachments,
                    tagEmployeeIds: tagEmployeeIds || []
                }
            })
            return res.status(200).json({ success: true, message: "Successfully updated case comment" });
        }

        const newComment = new CaseComment({
            role: req?.user?.role,
            name: req?.user?.fullName,
            type: req?.user?.empType,
            message: comment?.trim(),
            isPrivate: isPrivate ?? false,
            caseId: getCase?._id?.toString(),
            adminId: req?.user?._id,
            tagEmployeeIds: tagEmployeeIds || [],
            attachments: attachments,
        })
        await newComment.save()



        // send notification through email and db notification
        const notificationEmpUrl = `/employee/view case/${getCase?._id?.toString()}`
        const notificationAdminUrl = `/admin/view case/${getCase?._id?.toString()}`

        sendNotificationAndMail(
            getCase?._id?.toString(),
            `New comment added on Case file No. ${getCase?.fileNo}`,
            getCase?.branchId || "",
            req?.user?._id,
            notificationEmpUrl,
            notificationAdminUrl
        )

        return res.status(200).json({ success: true, message: "Successfully add case commit" });
    } catch (error) {
        console.log("adminAddCaseCommit in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}
// comment


export const getCaseEmployeeList = async (req, res) => {
    try {
        const { caseId } = req?.params
        if (!caseId) return res.status(400).json({ success: false, message: "caseId required" })
        if (!validMongooseId(caseId)) return res.status(400).json({ success: false, message: "Not a valid caseId" })

        const caseObjId = new Types.ObjectId(caseId)

        const empListPipeline = [
            // Find the case
            {
                $match: {
                    _id: caseObjId
                }
            },

            // Find employees working on this case
            {
                $lookup: {
                    from: "employees",
                    let: {
                        empObjId: "$empObjId",
                        branchId: "$branchId"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        // OR
                                        // employee.branchId == case.branchId
                                        // AND employee.type is allowed
                                        {
                                            $or: [
                                                {
                                                    $eq: [
                                                        "$_id",
                                                        "$$empObjId"
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                "$branchId",
                                                                "$$branchId"
                                                            ]
                                                        },
                                                        {
                                                            $in: [
                                                                {
                                                                    $toLower: "$type"
                                                                },
                                                                [
                                                                    "operation",
                                                                    "branch",
                                                                    "finance"
                                                                ]
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        },

                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                type: 1
                            }
                        }
                    ],
                    as: "employees"
                }
            },

            // Convert employees array into individual documents
            {
                $unwind: "$employees"
            },

            // Return only employee information
            {
                $replaceRoot: {
                    newRoot: "$employees"
                }
            },

            // Remove duplicate employees
            {
                $group: {
                    _id: "$_id",
                    fullName: { $first: "$fullName" },
                    type: { $first: "$type" }
                }
            },

            // Final response shape
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    type: 1
                }
            }
        ];

        const caseEmployeeList = await Case.aggregate(empListPipeline);

        const pipeline = [
            {
                $match: {
                    caseId: { $exists: true }, toEmployeeId: { $exists: true },
                    caseId: caseObjId
                }
            },
            { $project: { toEmployeeId: 1 } },
            {
                $lookup: {
                    from: "employees",
                    localField: "toEmployeeId",
                    foreignField: "_id",
                    as: "employee",
                    pipeline: [
                        { $project: { fullName: 1, type: 1 } }
                    ]
                }
            },
            { $unwind: "$employee" },
            {
                $replaceRoot: {
                    newRoot: "$employee"
                }
            }
        ]
        const getShareSection = await ShareSection.aggregate(pipeline)

        const combinedEmployees = [
            ...caseEmployeeList,
            ...getShareSection
        ];

        const uniqueEmployees = Array.from(
            new Map(
                combinedEmployees.map(emp => [
                    emp._id.toString(),
                    emp
                ])
            ).values()
        );
        return res.status(200).json({ success: true, message: "Successfully case employee list", data: uniqueEmployees });
    } catch (error) {
        console.log("getCaseEmployeeList in error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error: error });
    }
}


// share case to employee
// new version
export const adminShareCaseToEmployee = async (req, res) => {
    try {
        const { error } = validateAdminAddEmployeeToCase(req.body)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        const { shareCase = [], shareEmployee = [] } = req.body
        let bulkOps = []
        for (const toEmployeeId of shareEmployee) {
            const exists = await ShareSection.find({ toEmployeeId, caseId: { $in: shareCase } }, { caseId: 1 })
            let filter = shareCase?.filter(caseId => !exists?.map(ele => ele?.caseId?.toString())?.includes(caseId))
            filter?.forEach(caseId => {
                bulkOps.push({
                    insertOne: {
                        document: {
                            caseId,
                            toEmployeeId
                        }
                    }
                })
            })
        }
        await ShareSection.bulkWrite(bulkOps)
        return res.status(200).json({ success: true, message: "Successfully employee add to case" });
    } catch (error) {
        console.log("empOptShareCaseToEmployee  in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}