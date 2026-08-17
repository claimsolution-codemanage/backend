import { authClient } from "../../middleware/authentication.js";
import Case from "../../models/case/case.js";
import CaseDoc from "../../models/caseDoc.js";
import CaseStatus from "../../models/caseStatus.js";
import Client from "../../models/client.js";
import { getAllCaseQuery, sendNotificationAndMail, validMongooseId } from "../../utils/helper.js";
import { validateAddClientCase } from "../../utils/validateClient.js";
import mongoose, { Types } from "mongoose";

// add new case
export const addNewClientCase = async (req, res) => {
    try {
        const client = await Client.findById(req?.user?._id);
        if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
        if (!client?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })
        if (!client?.emailVerify) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                email: client?.email,
                message: "Please verify your email address"
            });
        }

        const { error } = validateAddClientCase(req.body);
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })
        req.body.consultantCode = client?.profile?.consultantCode
        req.body.clientId = client?._id
        req.body.clientObjId = client?._id
        req.body.caseFrom = "client"
        req.body.processSteps = []
        const newAddCase = new Case({ ...req.body, caseDocs: [], branchId: client?.branchId })
        const noOfCase = await Case.count()
        newAddCase.fileNo = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfCase + 1}`
        newAddCase.lastStatusDate = new Date()

        await newAddCase.save()
        const defaultStatus = new CaseStatus({
            caseId: newAddCase?._id?.toString(),
            date: new Date()
        })
        await defaultStatus.save()

        //  add case doc
        let bulkOps = [];
        (req?.body?.caseDocs || [])?.forEach((doc) => {
            bulkOps.push({
                insertOne: {
                    document: {
                        name: doc?.docName,
                        type: doc?.docType,
                        format: doc?.docFormat,
                        url: doc?.docURL,
                        clientId: req?.user?._id,
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
            `Client added new Case file No. ${newAddCase?.fileNo}`,
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

export const clientAddCaseFile = async (req, res) => {
    try {
        const verify = await authClient(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const client = await Client.findById(req?.user?._id)
        if (!client) return res.status(401).json({ success: false, message: "Account not found" })
        if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

        if (!client?.emailVerify) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                email: client?.email,
                message: "Please verify your email address"
            });
        }


        const { _id } = req.query
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

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
        console.log("updateAdminCase in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });

    }
}


export const viewClientCaseById = async (req, res) => {
    try {
        const { _id } = req.query
        const verify = await authClient(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const client = await Client.findById(req?.user?._id)
        if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
        if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

        //  console.log("query",query?.query);
        if (!validMongooseId(_id)) {
            return res.status(400).json({ success: false, message: "Not a valid id" });
        }

        const [caseData] = await Case.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(_id) } },
            {
                $lookup: {
                    from: "casepaymentdetails",
                    let: { caseId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$isActive", true] },
                                        { $eq: ["$caseId", "$$caseId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "casePayment"
                }
            },
            {
                $project: {
                    addEmployee: 0,
                    partnerReferenceCaseDetails: 0,
                    caseCommit: 0
                }
            }, {
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

        if (!caseData) {
            return res.status(404).json({ success: false, message: "Case not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Case data fetched successfully",
            data: caseData
        });

    } catch (error) {
        console.log("get all client case in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const viewCaseDocsById = async (req, res) => {
    try {
        const { _id } = req.params;
        const verify = await authClient(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const client = await Client.findById(req?.user?._id)
        if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
        if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })


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
        const verify = await authClient(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const client = await Client.findById(req?.user?._id)
        if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
        if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })


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

export const viewClientAllCase = async (req, res) => {
    try {
        const verify = await authClient(req, res)
        if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

        const client = await Client.findById(req?.user?._id)
        if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
        if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
        // query = ?statusType=&search=&limit=&pageNo
        const pageItemLimit = req.query.limit ? req.query.limit : 10;
        const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
        const searchQuery = req.query.search ? req.query.search : "";
        const statusType = req.query.status ? req.query.status : "";
        const startDate = req.query.startDate ? req.query.startDate : "";
        const endDate = req.query.endDate ? req.query.endDate : "";

        const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, req?.user?._id, false, true)
        // console.log("query", query?.query );
        if (!query.success) return res.status(400).json({ success: false, message: query.message })

        //  console.log("query",query?.query);
        const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
        const noOfCase = await Case.find(query?.query).count()
        const aggregationPipeline = [
            { $match: query?.query }, // Match the documents based on the query
            {
                $group: {
                    _id: null,
                    totalAmtSum: { $sum: "$claimAmount" }, // Calculate the sum of totalAmt
                }
            }
        ];
        const aggregateResult = await Case.aggregate(aggregationPipeline);
        return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: aggregateResult });

    } catch (error) {
        console.log("get all client case in error:", error);
        res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}