import { validMongooseId } from "../../utils/helper.js";
import Partner from "../../models/partner.js";

export const deletePartnerById = async (req, res) => {
   try {
        const { employee } = req
        if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { partnerId } = req?.query
      if (!partnerId) return res.status(400).json({ success: false, message: "PartnerId id required" })
      if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid PartnerId" })

      const deleteParnterById = await Partner.findByIdAndDelete(partnerId);
      if (!deleteParnterById) return res.status(404).json({ success: false, message: "Parnter not found" })

      return res.status(200).json({ success: true, message: "Successfully Parnter deleted" });
   } catch (error) {
      console.log("deletePartnerById in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}
