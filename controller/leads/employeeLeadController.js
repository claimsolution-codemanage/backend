import { validMongooseId } from "../../utils/helper.js";
import LeadRowModel from "../../models/leads/leadRow.js";
import LeadColumnModel from "../../models/leads/leadColumn.js";
import { validateLeadData } from "../../utils/validator/leads/validateLeadData.js";

const generateKey = (label) =>
    label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_");

export const createColumn = async (req, res) => {
    try {
        const { employee } = req
        let { key, label, type, options, order } = req.body;

        if (employee?.type?.toLowerCase() != "operation") {
            return res.status(400).json({ success: false, message: "Access denied" })
        }

        if (!label) {
            return res.status(400).json({ success: false, message: "Label is required" });
        }

        if (!key) {
            key = generateKey(label);
        }

        const exists = await LeadColumnModel.findOne({ key });
        if (exists) {
            return res.status(400).json({ success: false, message: "Column key already exists", });
        }

        const allowedTypes = ["text", "number", "date", "select"];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid column type", });
        }

        if (!order) {
            const last = await LeadColumnModel.findOne().sort({ order: -1 });
            order = last ? last.order + 1 : 1;
        }

        const column = await LeadColumnModel.create({
            key,
            label,
            type,
            options: options || [],
            order,
        });

        return res.status(201).json({ success: true, message: "Column created successfully", column, });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const allLeadColumns = async (req, res) => {
    try {
        const { employee } = req
        const isFullAccess = employee?.designation?.toLowerCase() == "manager" && employee?.type?.toLowerCase() == "operation"
        const result = await LeadColumnModel.find({ isActive: true, ...(!isFullAccess ? { key: { $ne: "assignedTo" } } : {}) }).sort({ order: 1 })
        return res.status(200).json({ success: true, message: "Successfully get all columns", data: result });
    } catch (error) {
        console.log("all-leads-columns in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const addNewLead = async (req, res) => {
    try {
        const { employee } = req
        const isFullAccess = employee?.designation?.toLowerCase() == "manager" && employee?.type?.toLowerCase() == "operation"
        const { assignedTo, followUpDate } = req.body
        const { error } = validateLeadData(req.body?.data)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })

        const newLead = new LeadRowModel({
            data: req?.body?.data,
            ...(!isFullAccess ? { assignedTo: employee?._id } : {}),
            ...(assignedTo ? { assignedTo } : {}),
            ...(followUpDate ? { followUpDate } : {}),
        })
        newLead.createdBy = employee?._id
        newLead.createdByModel = "Employee"
        newLead.branchId = employee?.branchId
        newLead.order = req.body?.order ?? 1
        await newLead.save()

        return res.status(200).json({ success: true, message: "Successfully added new lead", data: newLead });
    } catch (error) {
        console.log("empAddNewLead in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const allLeads = async (req, res) => {
    try {
        const { employee } = req
        const { where = {}, sort = {}, pagination = {} } = req.body
        const { isExport } = req.query
        const isFullAccess = employee?.designation?.toLowerCase() == "manager" && employee?.type?.toLowerCase() == "operation"
        const pipeline = [
            {
                $match: {
                    ...(!isFullAccess ? { $or: [{ assignedTo: employee?._id }, { createdBy: employee?._id, createdByModel: "Employee" }] } : {}),
                    // branchId: employee?.branchId
                    ...where
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "assignedTo",
                    foreignField: "_id",
                    as: "assignedTo",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                designation: 1,
                                type: 1,
                                empId: 1,
                                branchId: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$assignedTo",
                    preserveNullAndEmptyArrays: true
                }
            },
            ...(Object.keys(sort)?.length ? [{ $sort: sort }] : []),
            {
                "$facet": {
                    "data": isExport == "true" ? [] : [
                        { "$skip": pagination?.skip, },
                        { "$limit": pagination?.limit, },
                    ],
                    "totalCount": [
                        { "$count": "count", },
                    ],
                },
            },
        ]
        const result = await LeadRowModel.aggregate(pipeline)
        const data = result?.[0]?.data || []
        const noOfData = result?.[0]?.totalCount?.[0]?.count || 0

        return res.status(200).json({ success: true, message: "Successfully get all leads", data, noOfData });
    } catch (error) {
        console.log("all-leads in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const updateLead = async (req, res) => {
    try {
        const { employee } = req
        const { _id } = req.body
        const { assignedTo, followUpDate } = req.body

        const { error } = validateLeadData(req.body?.data)
        if (error) return res.status(400).json({ success: false, message: error.details[0].message })


        const isExist = await LeadRowModel.findById(_id)
        if (!isExist) return res.status(400).json({ success: false, message: "Lead not found", });
        isExist.updatedBy = employee?._id
        isExist.updatedByModel = "Employee"
        isExist.order = req.body?.order ?? 1
        isExist.assignedTo = assignedTo ?? null
        isExist.followUpDate = followUpDate ?? null

        const result = await isExist.save()
        return res.status(200).json({ success: true, message: "Successfully updated lead", data: result });
    } catch (error) {
        console.log("updateLead in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}

export const addOrUpdateLead = async (req, res) => {
    try {
        const { employee } = req;
        const payload = Array.isArray(req.body) ? req.body : [req.body];
        const isFullAccess = employee?.designation?.toLowerCase() == "manager" && employee?.type?.toLowerCase() == "operation"

        const updateOperations = [];
        const insertDocuments = [];

        for (let item of payload) {
            const { _id, assignedTo, followUpDate, data, order } = item;

            const { error } = validateLeadData(data);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message,
                });
            }

            if (_id) {
                // UPDATE
                updateOperations.push({
                    updateOne: {
                        filter: { _id },
                        update: {
                            $set: {
                                data,
                                assignedTo: isFullAccess ? (assignedTo || null) : employee?._id,
                                followUpDate: followUpDate || null,
                                order: order ?? 1,
                                branchId: employee?.branchId,
                                updatedBy: employee?._id,
                                updatedByModel: "Employee",
                            },
                        },
                    },
                });
            } else {
                // INSERT
                insertDocuments.push({
                    data,
                    assignedTo: isFullAccess ? (assignedTo || null) : employee?._id,
                    followUpDate: followUpDate || null,
                    order: order ?? 1,
                    branchId: employee?.branchId,
                    createdBy: employee?._id,
                    createdByModel: "Employee",
                });
            }
        }

        // 🔹 Execute updates
        if (updateOperations.length) {
            await LeadRowModel.bulkWrite(updateOperations);
        }

        // 🔹 Execute inserts and return created docs
        let insertedDocs = [];
        if (insertDocuments.length) {
            insertedDocs = await LeadRowModel.insertMany(insertDocuments);
        }

        return res.status(200).json({
            success: true,
            message: "Leads processed successfully",
            inserted: insertedDocs, // 🔥 return full inserted docs
        });

    } catch (error) {
        console.log("addOrUpdateLead error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error,
        });
    }
};



export const deleteLead = async (req, res) => {
    try {
        const { employee } = req
        if (employee?.type?.toLowerCase() != "operation") {
            return res.status(400).json({ success: false, message: "Access denied" })
        }
        const { _id } = req?.query

        if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Lead ID is not valid" })
        const isExist = await LeadRowModel.findByIdAndDelete(_id)
        if (!isExist) return res.status(400).json({ success: false, message: "Lead not found", });

        return res.status(200).json({ success: true, message: "Successfully deleted lead" });
    } catch (error) {
        console.log("delete-lead in error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error });
    }
}