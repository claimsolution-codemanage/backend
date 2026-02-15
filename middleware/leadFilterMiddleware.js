import moment from "moment";
import mongoose, { Types } from "mongoose";


export default function leadQueryParser(req, res, next) {
    const query = req.query;

    const where = {};
    const sort = {};
    const pagination = {};

    // ✅ Pagination
    const pageNo = parseInt(query.pageNo) || 1;
    const limit = parseInt(query.limit) || 10;

    pagination.page = pageNo;
    pagination.limit = limit;
    pagination.skip = (pageNo - 1) * limit;


    // ✅ Sorting
    if (query.sortBy) {
        const direction = query.orderBy === "desc" ? -1 : 1;

        // If sorting nested field inside data
        if (query.sortBy !== "followUpDate" && query.sortBy !== "assignedTo") {
            sort[`data.${query.sortBy}`] = direction;
        } else {
            sort[query.sortBy] = direction;
        }
    }


    // ✅ Process Filters
    Object.keys(query).forEach((key) => {
        // Skip reserved keys
        if (
            ["pageNo", "limit", "sortBy", "orderBy","isExport"].includes(key)
        ) {
            return;
        }

        // 🔹 Date From
        if (key.endsWith("_From")) {
            const field = key.replace("_From", "");

            if (!where[field]) where[field] = {};
            const startDate = moment(query[key]).startOf("day").toDate();
            if (field === "followUpDate") {
                where[field].$gte = startDate
            } else {
                where[`data.${field}`].$gte = startDate
            }
        }

        // 🔹 Date To
        else if (key.endsWith("_To")) {
            const field = key.replace("_To", "");

            if (!where[field]) where[field] = {};
            const endDate = moment(query[key]).endOf("day").toDate();
            if (field === "followUpDate") {
                where[field].$lte = endDate
            } else {
                where[`data.${field}`].$lte = endDate
            }
        }

        else if (key === "assignedTo") {
            where[key] = new Types.ObjectId(query[key])
        }
        // 🔹 Normal Filter
        else {
            where[`data.${key}`] = { $regex: query[key], $options: "i" };
        }
    });

    // Attach processed data
    req.body.where = where;
    req.body.sort = sort;
    req.body.pagination = pagination;

    next();
};

