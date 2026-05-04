import { Types } from "mongoose";
import CaseDoc from "../../models/caseDoc.js";
import { validMongooseId } from "../../utils/helper.js";


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