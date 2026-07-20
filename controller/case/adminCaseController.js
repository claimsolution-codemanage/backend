import axios from "axios";
import mongoose, { Types } from "mongoose";
import CaseDoc from "../../models/caseDoc.js";
import { getValidateDate, validMongooseId } from "../../utils/helper.js";
import Case from "../../models/case/case.js";
import { caseUpdateStatusTemplate } from "../../utils/emailTemplates/caseUpdateStatusTemplate.js";
import { sendMail } from "../../utils/sendMail.js";
import CaseStatus from "../../models/caseStatus.js";
import { validateAdminAddCaseFee, validateAdminUpdateCasePayment, validateEditAdminCaseStatus, validateUpdateAdminCase } from "../../utils/validateAdmin.js";
import * as dbFunction from "../../utils/dbFunction.js"
import { validateAddClientCase } from "../../utils/validateClient.js";
import CasePaymentDetails from "../../models/casePaymentDetails.js";
import CaseMergeDetails from "../../models/caseMergeDetails.js";
import CaseComment from "../../models/caseComment.js";
import Partner from "../../models/partner.js";
import Employee from "../../models/employee/employeeModel.js";


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

        const { mailMethod = "", nextFollowUp = "" } = req.body

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
            caseId: req.body._id
        })
        await addNewStatus.save()

        const subject = "Update on Your Case – Status Changed"
        // client
        if (updateCase?.clientObjId?.profile?.primaryEmail && (["client", "both"]?.includes(mailMethod?.toLowerCase()))) {
            sendMail({
                to: updateCase?.clientObjId?.profile?.primaryEmail,
                subject,
                html: caseUpdateStatusTemplate({ type: "Client", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/client/view case/${req.body._id}` })
            })
        }
        // partner
        if (updateCase?.partnerObjId?.profile?.primaryEmail && (["partner", "both"]?.includes(mailMethod?.toLowerCase()))) {
            sendMail({
                to: updateCase?.partnerObjId?.profile?.primaryEmail,
                subject,
                html: caseUpdateStatusTemplate({ type: "Partner", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/partner/view case/${req.body._id}` })
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
                    from: "casedocs",
                    let: { caseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $or: [{ $eq: ["$caseId", "$$caseId"] }, { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }] }
                                    ]
                                }
                            }
                        },
                        { $project: { adminId: 0 } }
                    ],
                    as: "caseDocs"
                }
            },
            {
                $lookup: {
                    from: "casestatuses",
                    let: { caseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $or: [{ $eq: ["$caseId", "$$caseId"] }, { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }] }
                                    ]
                                }
                            }
                        },
                        { $project: { adminId: 0 } },
                        { $sort: { createdAt: -1 } },
                    ],
                    as: "processSteps"
                }
            },
            {
                $lookup: {
                    from: "casecomments",
                    let: { caseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $or: [{ $eq: ["$caseId", "$$caseId"] }, { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "caseCommit"
                }
            },
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
        const { admin } = req
        const { _id } = req.query
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const mycase = await Case.find({ _id: _id })
        if (mycase.length == 0) return res.status(404).json({ success: false, message: "Case not found" })

        const { error } = validateAddClientCase(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })


        const newDoc = req?.body?.caseDocs?.filter(doc => doc?.new)

        const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body, caseDocs: [] } }, { new: true })

        let bulkOps = [];
        newDoc?.forEach((doc) => {
            bulkOps.push({
                insertOne: {
                    document: {
                        name: doc?.docName,
                        type: doc?.docType,
                        format: doc?.docFormat,
                        url: doc?.docURL,
                        employeeId: req?.user?._id,
                        isPrivate: doc?.isPrivate,
                        caseId: updateCase?._id?.toString(),
                    }
                }
            });
        });
        bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

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
                otherDetails: req.body.otherDetails || {},
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
                        byEmpId: employee?._id
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
                        byEmpId: employee?._id
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