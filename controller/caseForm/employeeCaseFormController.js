import { createOrUpdateCaseForm, getCaseFormDetailsById } from "../../utils/dbHelperFunc/case/form.js";

export const empCreateOrUpdateCaseForm = async (req, res, next) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })
      await createOrUpdateCaseForm(req, res, next)
   } catch (error) {
      console.log("empop sale emp in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empGetCaseFormById = async (req, res, next) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })
      req.isPrivate = employee?.type?.toLowerCase()==="operation"
      await getCaseFormDetailsById(req, res, next)
   } catch (error) {
      console.log("empop sale emp in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}
