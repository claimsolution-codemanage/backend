import Employee from "../models/employee.js";
import Partner from "../models/partner.js";
import Client from "../models/client.js";
import { validateEmployeeSignIn,validateEmployeeResetPassword,validateUpdateEmployeeCase } from "../utils/validateEmployee.js";
import { authEmployee, authPartner } from "../middleware/authentication.js";
import bcrypt from 'bcrypt'
import { validMongooseId,getAllCaseQuery,getAllPartnerSearchQuery,getAllClientSearchQuery,generatePassword } from "../utils/helper.js";
import Case from "../models/case.js";
import { sendEmployeeSigninMail } from "../utils/sendMail.js";
// import { getValidateDate } from "../utils/helper.js";

export const employeeAuthenticate = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})
      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Account not found"})
 
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Account is not active"})
 
      return res.status(200).json({success: true, message:"Authorized Client"})
   } catch (error) {
      console.log("employee auth error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
 }

export const employeeSignin = async(req,res)=>{
   try {
      const {error} = validateEmployeeSignIn(req.body)
      if(error) return res.status(400).json({success:false,message:error.details[0].message})

      const employee  = await Employee.find({email:req.body.email})
      if(employee.length==0) return res.status(404).json({success: false, message:"Employee account not exists"})

      const checkAuthEmployee = await bcrypt.compare(req.body.password,employee[0].password)
      if(!checkAuthEmployee) return res.status(401).json({success:false,message:"invaild email/password"})
      // console.log("employee",employee);
      const token = await employee[0]?.getAuth(true)
  
      return  res.status(200).header("x-auth-token", token)
      .header("Access-Control-Expose-Headers", "x-auth-token").json({success: true, message: "Successfully signIn"})
   } catch (error) {
      console.log("sign in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeResetPassword = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const {error} = validateEmployeeResetPassword(req.body)
      if(error) return res.status(400).json({success:false,message:error.details[0].message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})

      const {password,confirmPassword} = req.body
      if(password!==confirmPassword) return res.status(403).json({success: false, message:"confirm password must be same"})
      const bcryptPassword = await bcrypt.hash(password,10)
      
      const updateAdmin = await Employee.findByIdAndUpdate(req?.user?._id,{$set:{password:bcryptPassword}},{new:true})
      if(!updateAdmin) return res.status(400).json({success:false,message:"Employee not found"})
  
      return  res.status(200).json({success: true, message: "Successfully reset password"})
   } catch (error) {
      console.log("employeeResetPassword error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error}); 
   }
}

export const changeStatusEmployeeCase = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})

      const {error} = validateUpdateEmployeeCase(req.body)
      if(error) return res.status(400).json({success:false,message:error.details[0].message})
      console.log("case body",req.body);

      if(!validMongooseId(req.body._id)) return res.status(400).json({success: false, message:"Not a valid id"})


      const updateStatusBody ={date:new Date(),remark:req.body.remark,status:req.body.status,consultant:employee?.fullName}
      
      const updateCase = await Case.findByIdAndUpdate(req.body._id, {$push:{processSteps:updateStatusBody},currentStatus:req.body.status},{new:true})
      if(!updateCase) return res.status(404).json({success:false,message:"Case not found"})
      return res.status(200).json({success:true,message:`Case status change to ${req.body.status}`});

   } catch (error) {
      console.log("changeStatusEmployeeCase in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const viewAllEmployeeCase = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
         // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const empId = req?.user?.empType!="assistant" ?  req?.user?._id : false
      const query = getAllCaseQuery(statusType,searchQuery,startDate,endDate,false,false,empId)
      if(!query.success) return res.status(400).json({success: false, message: query.message})

      const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: 1 });
      const noOfCase = await Case.find(query?.query).count()
      return res.status(200).json({success:true,message:"get case data",data:getAllCase,noOfCase:noOfCase});
     
   } catch (error) {
      console.log("updateAdminCase in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeViewCaseByIdBy =async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Admin account not found"})


      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
  
      const getCase = await Case.findById(_id)
      if(!getCase) return res.status(404).json({success: false, message:"Case not found"})
    return res.status(200).json({success:true,message:"get case data",data:getCase});
     
   } catch (error) {
      console.log("updateAdminCase in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}


export const employeeViewAllPartner = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const partner = await Employee.findById(req?.user?._id)
      if(!partner) return res.status(401).json({success: false, message:"Employee account not found"})
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
      const searchQuery = req.query.search ? req.query.search : "";

   const query = getAllPartnerSearchQuery(searchQuery)
   const getAllPartner = await Partner.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: 1 });
   const noOfPartner = await Partner.find(query).count()
    return res.status(200).json({success:true,message:"get partner data",data:getAllPartner,noOfPartner:noOfPartner});
     
   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeViewPartnerById = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Admin account not found"})

      
      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
  
      const getPartner = await Partner.findById(_id).select("-password")
      if(!getPartner) return res.status(404).json({success: false, message:"Partner not found"})
    return res.status(200).json({success:true,message:"get partner by id data",data:getPartner});
     
   } catch (error) {
      console.log("employeeViewPartnerById in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeViewAllClient = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Admin account not found"})
         // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
      const searchQuery = req.query.search ? req.query.search : "";

   const query = getAllClientSearchQuery(searchQuery)
   const getAllClient = await Client.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: 1 });
   const noOfClient = await Client.find(query).count()
    return res.status(200).json({success:true,message:"get client data",data:getAllClient,noOfClient:noOfClient});
     
   } catch (error) {
      console.log("adminViewAllClient in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeViewClientById = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Admin account not found"})

      
      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
  
      const getClient = await Client.findById(_id).select("-password")
      if(!getClient) return res.status(404).json({success: false, message:"Client not found"})
    return res.status(200).json({success:true,message:"get client by id data",data:getClient});
     
   } catch (error) {
      console.log("employeeViewClientById in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeForgetPassword = async(req,res)=>{
   try {

      if(!req.body.email) return res.status(400).json({success: false, message:"Email is required"})
      const employee = await Employee.findById({email:req.body.email})
      if(employee.length==[0]) return res.status(401).json({success: false, message:"Admin account not found"})

      const systemPassword = generatePassword()
      const bcryptPassword = await bcrypt.hash(systemPassword,10)
      try {
         await sendEmployeeSigninMail(req.body.email,systemPassword);
         const updateEmployee = await Employee.findById(employee[0]._id,{password:bcryptPassword})
         return  res.status(200).json({success: true, message: "Successfully set mail"});
      } catch (err) {
       console.log("send otp error",err);
         return res.status(400).json({ success: false, message: "Failed to send OTP" });
      }
  
     
   } catch (error) {
      console.log("createEmployeeAccount in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeAddCaseComment = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Employee.findById(req?.user?._id)
      if(!admin) return res.status(401).json({success: false, message:"Employee account not found"})

      if(!req?.body?.Comment) return res.status(400).json({success: false, message:"Case Comment required"})
      if(!validMongooseId(req.body._id)) return res.status(400).json({success: false, message:"Not a valid id"})
      

      const newCommit = {
         _id:req?.user?._id,
         role:req?.user?.role,
         name:req?.user?.fullName,
         type:req?.user?.empType,
         commit:req?.body?.Comment,Date:new Date()}      
      const updateCase = await Case.findByIdAndUpdate(req.body._id,{$push:{caseCommit:newCommit}},{new:true})
      if(!updateCase) return res.status(400).json({success: false, message:"Case not found"})

      return  res.status(200).json({success: true, message: "Successfully add case commit"});
   } catch (error) {
      console.log("employeeAddCaseCommit in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}