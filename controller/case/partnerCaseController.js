import { authPartner } from "../../middleware/authentication.js";
import Case from "../../models/case/case.js";
import CaseDoc from "../../models/caseDoc.js";
import CaseStatus from "../../models/caseStatus.js";
import Partner from "../../models/partner.js";
import { getAllCaseQuery, sendNotificationAndMail, validMongooseId } from "../../utils/helper.js";
import { validateAddCase } from "../../utils/validatePatner.js";
import mongoose, { Types } from "mongoose";


export const addNewCase = async (req, res) => {
    try {
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
        const partner = await Partner.findById(req?.user?._id);
        if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

        if (!partner?.emailVerify) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                email: partner?.email,
                message: "Please verify your email address"
            });
        }

        const { error } = validateAddCase(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })


        req.body.partnerId = partner?._id
        req.body.partnerObjId = partner?._id
        req.body.partnerName = partner?.profile?.consultantName
        req.body.consultantCode = partner?.profile?.consultantCode
        req.body.partnerCode = partner?.profile?.consultantCode
        req.body.caseFrom = "partner"
        req.body.processSteps = []

        const newAddCase = new Case({ ...req.body, caseDocs: [], branchId: partner?.branchId })
        const noOfCase = await Case.count()
        newAddCase.fileNo = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfCase + 1}`
        newAddCase.lastStatusDate = new Date()
        await newAddCase.save()

        const defaultStatus = new CaseStatus({
            caseId: newAddCase?._id?.toString(),
            date: new Date()
        })
        await defaultStatus.save()

        let bulkOps = [];
        (req?.body?.caseDocs || [])?.forEach((doc) => {
            bulkOps.push({
                insertOne: {
                    document: {
                        name: doc?.docName,
                        type: doc?.docType,
                        format: doc?.docFormat,
                        url: doc?.docURL,
                        partnerId: req?.user?._id,
                        caseId: newAddCase?._id?.toString(),
                    }
                }
            });
        });
        bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

        // send notification through email and db notification
        const notificationEmpUrl = `/employee/view case/${newAddCase?._id?.toString()}`
        const notificationAdminUrl = `/admin/view case/${newAddCase?._id?.toString()}`

        sendNotificationAndMail(
            newAddCase?._id?.toString(),
            `Partner added new Case file No. ${newAddCase?.fileNo}`,
            newAddCase?.branchId || "",
            "",
            notificationEmpUrl,
            notificationAdminUrl
        )

        return res.status(201).json({ success: true, message: "Successfully add new case", data: newAddCase })
    } catch (error) {
        console.log("addNewCase: ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const viewAllCase = async (req, res) => {
    try {
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
        const partner = await Partner.findById(req?.user?._id);
        if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

        const allPartnerCase = await Case.find({ partnerObjId: partner?._id })
        return res.status(201).json({ success: true, message: "Successfully get all case", data: allPartnerCase })
    } catch (error) {
        console.log("view all partner Case: ", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const viewAllPartnerCase = async (req, res) => {
    try {
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const partner = await Partner.findById(req?.user?._id)
        if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
        // query = ?statusType=&search=&limit=&pageNo
        const pageItemLimit = req.query.limit ? req.query.limit : 10;
        const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
        const searchQuery = req.query.search ? req.query.search : "";
        const statusType = req.query.status ? req.query.status : "";
        const startDate = req.query.startDate ? req.query.startDate : "";
        const endDate = req.query.endDate ? req.query.endDate : "";

        const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req?.user?._id, false, false, true)
        if (!query.success) return res.status(400).json({ success: false, message: query.message })
        const aggregationPipeline = [
            { $match: query?.query }, // Match the documents based on the query
            {
                $group: {
                    _id: null,
                    totalAmtSum: { $sum: "$claimAmount" }, // Calculate the sum of totalAmt
                    totalResolvedAmt: {
                        $sum: { $cond: [{ $eq: ["$currentStatus", "Resolve"] }, "$claimAmount", 0] } // Calculate the sum of claimAmount for resolved cases
                    }
                }
            }
        ];

        //  console.log("query",query?.query);
        const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
        const noOfCase = await Case.find(query?.query).count()
        const aggregateResult = await Case.aggregate(aggregationPipeline);
        return res.status(200).json({ success: true, message: "get case data", totalAmt: aggregateResult, data: getAllCase, noOfCase: noOfCase });

    } catch (error) {
        console.log("updateAdminCase in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const partnerViewCaseById = async (req, res) => {
    try {
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const partner = await Partner.findById(req?.user?._id)
        if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
        if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })

        const { _id } = req.query;

        if (!validMongooseId(_id)) {
            return res.status(400).json({ success: false, message: "Not a valid id" });
        }

        const caseId = new Types.ObjectId(_id);

        const caseData = await Case.aggregate([
            { $match: { _id: caseId } },
            {
                $lookup: {
                    from: "casedocs",
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] },
                                        { $ne: ["$isPrivate", true] },
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
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] }
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
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] }
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
                    localField: "_id",
                    foreignField: "caseId",
                    pipeline: [{ $match: { isActive: true } }],
                    as: "casePayment"
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
        ]);

        if (!caseData.length) {
            return res.status(404).json({ success: false, message: "Case not found" });
        }

        const result = caseData[0];

        if (result.caseGroDetails) {
            result.caseGroDetails = {
                ...result.caseGroDetails,
                groStatusUpdates: result.caseGroDetails?.groStatusUpdates?.filter(ele => ele?.isPrivate) || [],
                queryHandling: result.caseGroDetails?.queryHandling?.filter(ele => ele?.isPrivate) || [],
                queryReply: result.caseGroDetails?.queryReply?.filter(ele => ele?.isPrivate) || [],
                approvalLetter: result.caseGroDetails?.approvalLetterPrivate ? "" : result.caseGroDetails?.approvalLetter,
            };
        }

        if (result.caseOmbudsmanDetails) {
            result.caseOmbudsmanDetails = {
                ...result.caseOmbudsmanDetails,
                statusUpdates: result.caseOmbudsmanDetails?.statusUpdates?.filter(ele => ele?.isPrivate) || [],
                queryHandling: result.caseOmbudsmanDetails?.queryHandling?.filter(ele => ele?.isPrivate) || [],
                queryReply: result.caseOmbudsmanDetails?.queryReply?.filter(ele => ele?.isPrivate) || [],
                hearingSchedule: result.caseOmbudsmanDetails?.hearingSchedule?.filter(ele => ele?.isPrivate) || [],
                awardPart: result.caseOmbudsmanDetails?.awardPart?.filter(ele => ele?.isPrivate) || [],
                approvalLetter: result.caseOmbudsmanDetails?.approvalLetterPrivate ? "" : result.caseOmbudsmanDetails?.approvalLetter,
            };
        }

        return res.status(200).json({ success: true, message: "get case data", data: result });

    } catch (error) {
        console.error("employeeViewCaseByIdBy error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error });
    }
};


export const partnerAddCaseFile = async (req, res) => {
    try {
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const partner = await Partner.findById(req?.user?._id)
        if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

        const { _id } = req.query
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const mycase = await Case.findByIdAndUpdate(_id, { $push: { caseDocs: req.body } }, { new: true })
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
                        partnerId: req?.user?._id
                    }
                }
            });
        });
        bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)
        return res.status(200).json({ success: true, message: "Successfully add case file" })
    } catch (error) {
        console.log("updateAdminCase in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}

export const viewCaseDocsById = async (req, res) => {
    try {
        const { _id } = req.params;
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const partner = await Partner.findById(req?.user?._id)
        if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })


        if (!validMongooseId(_id)) {
            return res.status(400).json({ success: false, message: "Not a valid id" });
        }

        const caseId = new Types.ObjectId(_id);

        const query = {
            isActive: true,
            $and: [
                {
                    $or: [
                        { caseId: caseId },
                        { caseMargeId: _id.toString() }
                    ],
                },
                {
                    $or: [
                        { isPrivate: false },
                        { isPrivate: { $exists: false } }
                    ]
                }
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
        const verify = await authPartner(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const partner = await Partner.findById(req?.user?._id)
        if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
        if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })


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

        const steps = await CaseStatus.find(query).select("status createdAt remark date attachments otherDetails").sort({ createdAt: -1 });

        return res.status(200).json({ success: true, message: "get case process steps data", data: steps });
    } catch (error) {
        console.error("viewCaseProcessStepsById error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error });
    }
};