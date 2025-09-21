import { createOrUpdateCaseForm, getCaseFormDetailsById } from "../../utils/dbHelperFunc/case/form.js";

export const adminCreateOrUpdateCaseForm = async (req, res, next) => {
   try {
      await createOrUpdateCaseForm(req, res, next)
   } catch (error) {
      console.log("adminCreateOrUpdateCaseForm in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminGetCaseFormById = async (req, res, next) => {
   try {
      req.isPrivate = true
      await getCaseFormDetailsById(req, res, next)
   } catch (error) {
      console.log("adminGetCaseFormById in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}
