import { validMongooseId } from "../../utils/helper.js";
import Bill from "../../models/bill.js";

export const deleteInvoiceById = async (req, res) => {
    try {
        const { employee } = req
        if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id, type } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      await Bill.findByIdAndDelete(_id)

      return res.status(200).json({ success: true, message: `Successfully delete invoice` });
   } catch (error) {
      console.log("deleteInvoiceById in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong!", error: error });
   }
}