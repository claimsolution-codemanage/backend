import { validMongooseId } from "../../utils/helper.js";
import Employee from "../../models/employee.js";

export const deleteTeamEmpAccount = async (req, res) => {
   try {
    const { employee } = req
    if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id } = req.query

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const isExist = await Employee.findById(_id)
      if (!isExist) return res.status(401).json({ success: false, message: "Employee not found" })
      await Employee.findByIdAndDelete(_id)
      return res.status(200).json({ success: true, message: "Successfully remove Employee" });

   } catch (error) {
      console.log("deleteTeamEmpAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}