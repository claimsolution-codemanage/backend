import Admin from "../models/admin.js"
import Job from "../models/job.js"
import { authAdmin } from "../middleware/authentication.js"
import { validMongooseId } from "../utils/helper.js"
import { validateAdminAddJob } from "../utils/validateAdmin.js"


export const adminAddJob = async (req,res)=>{
    try {
       const verify =  await authAdmin(req,res)
       if(!verify.success) return  res.status(401).json({success: false, message: verify.message})
 
       const admin = await Admin.findById(req?.user?._id)
       if(!admin) return res.status(401).json({success: false, message:"Admin account not found"})

       const {error} = validateAdminAddJob(req.body)
       if(error) return res.status(400).json({success:false,message:error.details[0].message})
 
       const newJob = new Job(req.body)
       await newJob.save()
 
       return  res.status(200).json({success: true, message: "Successfully add job",data:newJob});
    } catch (error) {
       console.log("adminAddCaseCommit in error:",error);
       return res.status(500).json({success:false,message:"Internal server error",error:error});
    }
 }

 export const allJob = async (req,res)=>{
    try {
        const allJob = await Job.find({}).sort({ createdAt: 1 })

       return  res.status(200).json({success: true, message: "Successfully get all job",data:allJob});
    } catch (error) {
       console.log("allJob in error:",error);
       return res.status(500).json({success:false,message:"Internal server error",error:error});
    }
 }

 export const adminDeleteJob = async (req,res)=>{
    try {
        const verify =  await authAdmin(req,res)
        if(!verify.success) return  res.status(401).json({success: false, message: verify.message})
  
        const admin = await Admin.findById(req?.user?._id)
        if(!admin) return res.status(401).json({success: false, message:"Admin account not found"})
  
        if(!validMongooseId(req.query._id)) return res.status(400).json({success: false, message:"Not a valid id"})
        const deleteJob = await Job.findByIdAndDelete(req.query._id)
       return  res.status(200).json({success: true, message: "Successfully job remove"});
    } catch (error) {
       console.log("allJob in error:",error);
       return res.status(500).json({success:false,message:"Internal server error",error:error});
    }
 }