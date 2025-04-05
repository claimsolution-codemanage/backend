import Complaint from "../models/complaint.js";
import { validateAddComplaint } from "../utils/helper.js";
import { authAdmin } from "../middleware/authentication.js";
import Admin from "../models/admin.js";
import { validMongooseId } from "../utils/helper.js";

export const addComplaint = async (req,res)=>{
    try {
        const {error} = validateAddComplaint(req.body)
        if(error) return res.status(400).json({success:false,message:error.details[0].message})
      
        const newComplaint = new Complaint(req?.body)
        await newComplaint.save()

       return  res.status(200).json({success: true, message: "Successfully complaint registered"});
    } catch (error) {
       console.log("adminAddCaseCommit in error:",error);
       return res.status(500).json({success:false,message:"Internal server error",error:error});
    }
 }


 export const viewAllAdminComplaint = async(req,res)=>{
    try {
      const {admin} = req
      //  const verify =  await authAdmin(req,res)
      //  if(!verify.success) return  res.status(401).json({success: false, message: verify.message})
 
      //  const admin = await Admin.findById(req?.user?._id)
      //  if(!admin) return res.status(401).json({success: false, message:"Admin account not found"})
      // if(!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


       const pageItemLimit = req.query.limit ? req.query.limit : 10;
       const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
       const searchQuery = req.query.search ? req.query.search : "";
       const startDate = req.query.startDate ? req.query.startDate : "";
       const endDate = req.query.endDate ? req.query.endDate : "";

       if (startDate && endDate) {
        const validStartDate = getValidateDate(startDate)
        if(!validStartDate) return {success:false,message:"start date not formated"}
        const validEndDate = getValidateDate(endDate)
        if(!validEndDate) return {success:false,message:"end date not formated"}
      }
 
    let query = {
     $and:[
      {$or: [
          { name: { $regex: searchQuery, $options: "i" }},
          { email: { $regex: searchQuery, $options: "i" }},
          { moblieNo: { $regex: searchQuery, $options: "i" }},
          { claim_type: { $regex: searchQuery, $options: "i" }},
          { complaint_type: { $regex: searchQuery, $options: "i" }},
          { complaint_brief: { $regex: searchQuery, $options: "i" }},
      ]},
      startDate && endDate ? {
       createdAt: { $gte: new Date(startDate).setHours(0, 0, 0, 0), 
         $lte: new Date(endDate).setHours(23, 59, 59, 999) }
   } : {}
     ]
  };
 
   
    const getAllComplaint = await Complaint.find(query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
    const noOfComplaint = await Complaint.find(query).count()
     return res.status(200).json({success:true,message:"get complaint data",data:getAllComplaint,noOfComplaint});
      
    } catch (error) {
       console.log("all complaints in error:",error);
       res.status(500).json({success:false,message:"Internal server error",error:error});
       
    }
 }

 export const adminRemoveComplaintById = async(req,res)=>{
   try {
      const {admin} = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if(!admin) return res.status(401).json({success: false, message:"Admin account not found"})
      // if(!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const complaint = await Complaint.findByIdAndRemove(_id) 
      if(!complaint) return res.status(404).json({success:false,message:"Complaint not found"})

    return res.status(200).json({success:true,message:"Successfully remove complaint"});
     
   } catch (error) {
      console.log("remove complaints in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}