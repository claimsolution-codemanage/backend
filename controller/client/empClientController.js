import { validMongooseId } from "../../utils/helper.js";
import Client from "../../models/client.js";

export const deleteClientById = async (req, res) => {
    try {
       const { employee } = req
       if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { clientId } = req?.query
      if (!clientId) return res.status(400).json({ success: false, message: "ClientId id required" })
      if (!validMongooseId(clientId)) return res.status(400).json({ success: false, message: "Not a valid ClientId" })

      const deleteClientById = await Client.findByIdAndDelete(clientId);
      if (!deleteClientById) return res.status(404).json({ success: false, message: "Client not found" })

      return res.status(200).json({ success: true, message: "Successfully Client deleted" });
   } catch (error) {
      console.log("deleteClientById in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}