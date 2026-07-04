import Employee from "../../models/employee/employeeModel.js";
import Partner from "../../models/partner.js";
import Statement from "../../models/statement.js"
import { getAllStatementDownloadExcel, getValidateDate, validMongooseId } from "../../utils/helper.js"
import mongoose, { Types } from "mongoose";

export const bulkCreateOrUpdateStatement = async (req, res) => {
    try {
        const { statements = [] } = req.body

        if (!Array.isArray(statements) || !statements.length) {
            return res.status(400).json({ success: false, message: "No statements provided" })
        }

        // 🔹 Helpers
        const clean = (val) => (val !== "" && val !== null && val !== undefined ? val : undefined)
        const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

        // 🔹 Step 1: Collect identifiers
        const partnerEmails = new Set()
        const empEmails = new Set()
        const partnerIds = new Set()
        const empIds = new Set()

        statements.forEach(s => {
            if (clean(s.partnerEmail)) partnerEmails.add(s.partnerEmail.toLowerCase())
            if (clean(s.empEmail)) empEmails.add(s.empEmail.toLowerCase())
            if (clean(s.partnerId) && isValidObjectId(s.partnerId)) partnerIds.add(s.partnerId)
            if (clean(s.empId) && isValidObjectId(s.empId)) empIds.add(s.empId)
        })

        // 🔹 Step 2: Fetch in bulk
        const partners = await Partner.find({
            $or: [
                { email: { $in: [...partnerEmails] } },
                { _id: { $in: [...partnerIds] } }
            ]
        })

        const employees = await Employee.find({
            $or: [
                { email: { $in: [...empEmails] } },
                { _id: { $in: [...empIds] } }
            ]
        })

        // 🔹 Step 3: Create lookup maps
        const partnerMap = new Map()
        partners.forEach(p => {
            if (p.email) partnerMap.set(p.email.toLowerCase(), p)
            partnerMap.set(p._id.toString(), p)
        })

        const empMap = new Map()
        employees.forEach(e => {
            if (e.email) empMap.set(e.email.toLowerCase(), e)
            empMap.set(e._id.toString(), e)
        })

        // 🔹 Step 4: Prepare bulk ops
        const bulkOps = []
        const failed = []

        const updateKeys = [
            "caseLogin", "policyHolder", "fileNo", "policyNo",
            "insuranceCompanyName", "claimAmount", "approvedAmt",
            "constultancyFee", "TDS", "modeOfLogin",
            "payableAmt", "utrDetails", "fileUrl"
        ]

        for (let s of statements) {
            try {
                let doc = {}

                // 🔸 Clean IDs
                const partnerEmail = clean(s.partnerEmail)?.toLowerCase()
                const empEmail = clean(s.empEmail)
                const partnerId = clean(s.partnerId)
                const empId = clean(s.empId)

                // 🔸 Resolve Partner
                if (partnerEmail || partnerId) {
                    const partner =
                        partnerMap.get(partnerEmail) ||
                        partnerMap.get(partnerId)

                    if (!partner) {
                        failed.push({ statement: s, reason: "Partner not found" })
                        continue
                    }

                    doc.partnerId = partner._id
                    doc.branchId = partner.branchId
                }

                // 🔸 Resolve Employee
                if (empEmail || empId) {
                    const emp =
                        empMap.get(empEmail?.toLowerCase()) ||
                        empMap.get(empId)

                    if (!emp) {
                        failed.push({ statement: s, reason: "Employee not found" })
                        continue
                    }

                    doc.empId = emp._id
                    doc.branchId = emp.branchId
                }

                // 🔸 Assign safe fields
                updateKeys.forEach(key => {
                    if (clean(s[key]) !== undefined) {
                        doc[key] = s[key]
                    }
                })

                // 🔸 Update vs Insert
                if (clean(s._id) && isValidObjectId(s._id)) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: s._id },
                            update: { $set: doc }
                        }
                    })
                } else {
                    bulkOps.push({
                        insertOne: {
                            document: {
                                ...doc,
                                isActive: true
                            }
                        }
                    })
                }

            } catch (err) {
                failed.push({ statement: s, reason: err.message })
            }
        }

        // 🔹 Step 5: Execute bulk
        if (bulkOps.length) {
            await Statement.bulkWrite(bulkOps)
        }

        return res.status(200).json({
            success: true,
            message: "Bulk operation completed",
            processed: bulkOps.length,
            failedCount: failed.length,
            failed
        })

    } catch (error) {
        console.log("bulkCreateOrUpdateStatement error:", error)
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        })
    }
}


export const getStatement = async (req, res) => {
    try {
        const { admin } = req
        const { empId, partnerId, startDate, endDate, limit, pageNo, isPdf } = req.query
        const pageItemLimit = limit ? limit : 10;
        const page = pageNo ? (pageNo - 1) * pageItemLimit : 0;


        if (startDate && endDate) {
            const validStartDate = getValidateDate(startDate)
            if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
            const validEndDate = getValidateDate(endDate)
            if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
        }

        let matchQuery = []

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

        let statementOf = {}

        if (empId) {
            const emp = await Employee.findById(empId).select({
                'fullName': 1,
                'bankName': 1,
                'bankBranchName': 1,
                'bankAccountNo': 1,
                'panNo': 1,
                'address': 1,
                'branchId': 1,
                'empId': 1,
            })
                .populate("referEmpId", "fullName")
            if (!emp) {
                return res.status(400).json({ status: false, message: 'Employee not found' })
            }
            statementOf.employee = emp
            matchQuery.push({
                empId: new Types.ObjectId(empId)
            })
        }

        if (partnerId) {
            const partner = await Partner.findById(partnerId,).select({
                'bankingDetails.bankName': 1,
                'bankingDetails.bankAccountNo': 1,
                'bankingDetails.bankBranchName': 1,
                'bankingDetails.panNo': 1,
                'bankingDetails.branchId': 1,
                'profile.consultantName': 1,
                'profile.consultantCode': 1,
                'profile.address': 1,
                'branchId': 1,
            }).populate("salesId", "fullName")
            if (!partner) {
                return res.status(400).json({ status: false, message: 'Partner not found' })
            }
            statementOf.partner = partner
            matchQuery.push({
                partnerId: new Types.ObjectId(partnerId)
            })
        }


        const allStatement = await Statement.aggregate([
            {
                $match: {
                    $and: [
                        ...matchQuery,
                        { isActive: true }

                    ]
                }
            },
            {
                $lookup: {
                    from: 'partners',
                    localField: 'partnerId',
                    foreignField: '_id',
                    as: 'partnerDetails',
                    pipeline: [
                        {
                            $project: {
                                'profile.consultantName': 1,
                                'profile.consultantCode': 1,

                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: '$partnerDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'empId',
                    foreignField: '_id',
                    as: 'empDetails',
                    pipeline: [
                        {
                            $project: {
                                'fullName': 1,
                                'type': 1,
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: '$empDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            { '$sort': { 'createdAt': -1 } },
            {
                $facet: {
                    statement: [
                        ...(isPdf == "true" ? [] : [
                            { $skip: Number(page) },
                            { $limit: Number(pageItemLimit) }
                        ])
                    ],
                    total: [
                        { $count: "count" }
                    ]
                }
            }
        ])

        const data = allStatement?.[0]?.statement
        const totalData = allStatement?.[0]?.total?.[0]?.count || 0

        return res.status(200).json({ success: true, message: `Successfully fetch all statement`, data: { data: data, totalData, statementOf } });

    } catch (error) {
        console.log("createOrUpdateStatement in error:", error);
        res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

    }
}

export const adminDownloadAllStatement = async (req, res) => {
    try {
        const { admin } = req
        const { empId, partnerId, startDate, endDate } = req.query

        if (startDate && endDate) {
            const validStartDate = getValidateDate(startDate)
            if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
            const validEndDate = getValidateDate(endDate)
            if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
        }

        let matchQuery = []

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

        if (empId) {
            matchQuery.push({ empId: new Types.ObjectId(empId) })
        }

        if (partnerId) {
            matchQuery.push({ partnerId: new Types.ObjectId(partnerId) })
        }

        const pipeline = [
            {
                '$match': {
                    '$and': [
                        ...matchQuery,
                        { 'isActive': true }
                    ]
                }
            }, {
                '$lookup': {
                    'from': 'partners',
                    'localField': 'partnerId',
                    'foreignField': '_id',
                    'as': 'partnerDetails',
                    'pipeline': [
                        {
                            '$lookup': {
                                'from': 'employees',
                                'localField': 'salesId',
                                'foreignField': '_id',
                                'as': 'referby',
                                'pipeline': [
                                    {
                                        '$project': {
                                            'fullName': 1,
                                            'email': 1,
                                            'type': 1
                                        }
                                    }
                                ]
                            }
                        }, {
                            '$unwind': {
                                'path': '$referby'
                            }
                        }, {
                            '$project': {
                                'bankName': '$bankingDetails.bankName',
                                'bankAccountNo': '$bankingDetails.bankAccountNo',
                                'bankBranchName': '$bankingDetails.bankBranchName',
                                'panNo': '$bankingDetails.panNo',
                                'bankBranchName': '$bankingDetails.bankBranchName',
                                'consultantName': '$profile.consultantName',
                                'consultantCode': '$profile.consultantCode',
                                'address': '$profile.address',
                                'branchId': 1,
                                'referby': 1
                            }
                        }
                    ]
                }
            }, {
                '$unwind': {
                    'path': '$partnerDetails',
                    'preserveNullAndEmptyArrays': true
                }
            }, {
                '$lookup': {
                    'from': 'employees',
                    'localField': 'empId',
                    'foreignField': '_id',
                    'as': 'empDetails',
                    'pipeline': [
                        {
                            '$lookup': {
                                'from': 'employees',
                                'localField': 'referEmpId',
                                'foreignField': '_id',
                                'as': 'referby',
                                'pipeline': [
                                    {
                                        '$project': {
                                            'fullName': 1,
                                            'email': 1,
                                            'type': 1
                                        }
                                    }
                                ]
                            }
                        }, {
                            '$unwind': {
                                'path': '$referby'
                            }
                        }, {
                            '$project': {
                                'fullName': 1,
                                'bankName': 1,
                                'bankAccountNo': 1,
                                'bankBranchName': 1,
                                'panNo': 1,
                                'address': 1,
                                'type': 1,
                                'email': 1,
                                'branchId': 1,
                                'empId': 1,
                                'referby': 1
                            }
                        }
                    ]
                }
            }, {
                '$unwind': {
                    'path': '$empDetails',
                    'preserveNullAndEmptyArrays': true
                }
            }, {
                '$sort': {
                    'createdAt': -1
                }
            }
        ]

        const allStatement = await Statement.aggregate(pipeline)

        const excelBuffer = await getAllStatementDownloadExcel(allStatement);
        res.setHeader('Content-Disposition', 'attachment; filename="statement.xlsx"')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.status(200)
        res.send(excelBuffer)
    } catch (error) {
        console.log("downloadAllStatement error:", error);
        return res.status(500).json({ success: false, message: "Oops! something went wrong", error: error })

    }
}

export const adminChangeStatementStatus = async (req, res) => {
    try {
        const { admin } = req

        const { _id } = req.body;
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

        const { remark = "", status } = req.body
        if (!status) return res.status(400).json({ success: false, message: "Status is required" })

        const invoice = await Statement.findByIdAndUpdate(_id, { $set: { remark: remark, isPaid: status == "paid" ? true : false, paidBy: "operation", paidDate: new Date() } })
        if (!invoice) return res.status(404).json({ success: true, message: "Details not found" });
        return res.status(200).json({ success: true, message: "Successfully update statement" });
    } catch (error) {
        console.log("admin-Paid-statement in error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error: error });
    }
}


export const getAllStatement = async (req, res) => {
    try {
        const { admin } = req

        const { search, startDate, endDate, limit, pageNo } = req.query
        const pageItemLimit = limit ? limit : 10;
        const page = pageNo ? (pageNo - 1) * pageItemLimit : 0;


        if (startDate && endDate) {
            const validStartDate = getValidateDate(startDate)
            if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
            const validEndDate = getValidateDate(endDate)
            if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
        }

        let matchQuery = []

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

        const allStatement = await Statement.aggregate([
            {
                $match: {
                    $and: [
                        ...matchQuery,
                        { isActive: true }

                    ]
                }
            },
            {
                $lookup: {
                    from: 'partners',
                    localField: 'partnerId',
                    foreignField: '_id',
                    as: 'partnerDetails',
                    pipeline: [
                        {
                            $project: {
                                'profile.consultantName': 1,
                                'profile.consultantCode': 1,
                                'bankingDetails.bankName': 1,
                                'bankingDetails.bankAccountNo': 1,
                                'bankingDetails.bankBranchName': 1,
                                'bankingDetails.panNo': 1,
                                'bankingDetails.branchId': 1,
                                'profile.consultantName': 1,
                                'profile.consultantCode': 1,
                                'profile.address': 1,
                                'branchId': 1,
                            }
                        },
                        {
                            "$lookup": {
                                from: 'employees',
                                localField: 'salesId',
                                foreignField: '_id',
                                as: 'salesId',
                                pipeline: [
                                    {
                                        "$project": {
                                            "fullName": 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $unwind: {
                                path: '$salesId',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                    ]
                }
            },
            {
                $unwind: {
                    path: '$partnerDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'empId',
                    foreignField: '_id',
                    as: 'empDetails',
                    pipeline: [
                        {
                            $project: {
                                'fullName': 1,
                                'type': 1,
                                'bankName': 1,
                                'bankBranchName': 1,
                                'bankAccountNo': 1,
                                'panNo': 1,
                                'address': 1,
                                'branchId': 1,
                                'empId': 1,
                            }
                        },
                        {
                            "$lookup": {
                                "from": 'employees',
                                "localField": 'referEmpId',
                                "foreignField": '_id',
                                "as": 'referEmpId',
                                "pipeline": [
                                    {
                                        "$project": {
                                            "fullName": 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            "$unwind": {
                                "path": '$referEmpId',
                                "preserveNullAndEmptyArrays": true
                            }
                        },
                    ]
                }
            },
            {
                "$unwind": {
                    "path": '$empDetails',
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$match": {
                    "$and": [
                        // Regex-based search after lookup
                        search ? {
                            $or: [
                                { 'partnerDetails.profile.consultantName': { $regex: search, $options: 'i' } },
                                { 'partnerDetails.profile.consultantCode': { $regex: search, $options: 'i' } },
                                { 'empDetails.fullName': { $regex: search, $options: 'i' } },
                            ]
                        } : { isActive: true }
                    ]
                }
            },
            { '$sort': { 'createdAt': -1 } },
            {
                $facet: {
                    statement: [
                        { $skip: Number(page) },
                        { $limit: Number(pageItemLimit) },
                    ],
                    total: [
                        { $count: "count" }
                    ]
                }
            }
        ])

        const data = allStatement?.[0]?.statement
        const totalData = allStatement?.[0]?.total?.[0]?.count || 0

        return res.status(200).json({ success: true, message: `Successfully fetch all statement`, data: { data: data, totalData } });

    } catch (error) {
        console.log("createOrUpdateStatement in error:", error);
        res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

    }
}



// delete statement
export const deleteStatement = async (req, res) => {
    try {
        const { _id } = req.query
        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
        const statement = await Statement.findByIdAndDelete(_id)
        if (!statement) return res.status(404).json({ success: true, message: "Statement not found" });
        return res.status(200).json({ success: true, message: "Statement deleted successfully" });
    } catch (error) {
        console.log("deleteStatement error:", error)
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}