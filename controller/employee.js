import Employee from "../models/employee.js";
import Partner from "../models/partner.js";
import Client from "../models/client.js";
import { validateEmployeeSignIn,validateEmployeeResetPassword,validateUpdateEmployeeCase,validateAddPartner,validateAddEmpCase } from "../utils/validateEmployee.js";
import { authEmployee, authPartner } from "../middleware/authentication.js";
import bcrypt from 'bcrypt'
import { validMongooseId,getAllCaseQuery,getAllPartnerSearchQuery,getAllClientSearchQuery,generatePassword, getDownloadCaseExcel } from "../utils/helper.js";
import { sendForgetPasswordMail } from "../utils/sendMail.js";
import Jwt from "jsonwebtoken";
import Case from "../models/case.js";
import { validateAddClientCase, validateClientProfileBody } from "../utils/validateClient.js";
import { validateResetPassword } from "../utils/helper.js";
import jwtDecode from "jwt-decode";
import { validateInvoice } from "../utils/validateEmployee.js";
import Bill from "../models/bill.js";
import { getAllInvoiceQuery } from "../utils/helper.js";
import { invoiceHtmlToPdfBuffer } from "../utils/createPdf/invoice.js";
import { validateBankingDetailsBody, validateProfileBody } from "../utils/validatePatner.js";
// import { getValidateDate } from "../utils/helper.js";
import { sendAddPartnerRequest } from "../utils/sendMail.js";
import { firebaseUpload } from "../utils/helper.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import CaseComment from "../models/caseComment.js";


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

 export const employeeUploadImage = async (req, res) => {
   try {
     firebaseUpload(req, res, "images");
   } catch (error) {
     console.log("employeeUploadImage", error);
     return res.status(500).json({ success: false, message: "Oops something went wrong" });
   }
 }
 
 export const employeeUploadAttachment = async (req, res) => {
   try {
     firebaseUpload(req, res, "attachments");
   } catch (error) {
     console.log("employeeUploadAttachment", error);
     return res.status(500).json({ success: false, message: "Oops something went wrong" });
   }
 }
 



export const employeeSignin = async(req,res)=>{
   try {
      const {error} = validateEmployeeSignIn(req.body)
      if(error) return res.status(400).json({success:false,message:error.details[0].message})

      const employee  = await Employee.find({email:req.body.email})
      if(employee.length==0) return res.status(401).json({success: false, message:"Employee account not exists"})

      if(!employee?.[0]?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})

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
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})


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
      if(!employee?.isActive) return res.status(400).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="operation"){
         return res.status(400).json({success: false, message:"Access denied"})
      }

      const {error} = validateUpdateEmployeeCase(req.body)
      if(error) return res.status(400).json({success:false,message:error.details[0].message})
      console.log("case body",req.body);

      if(!validMongooseId(req.body._id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const updateCase = await Case.findByIdAndUpdate(req.body._id, {currentStatus:req.body.status},{new:true})
      if(!updateCase) return res.status(404).json({success:false,message:"Case not found"})
      const addNewStatus = new CaseStatus({
         remark:req.body.remark,
         status:req.body.status,
         consultant:employee?.fullName,
         employeeId:req?.user?._id,
         caseId:req.body._id
      })
      await addNewStatus.save()
      return res.status(200).json({success:true,message:`Case status change to ${req.body.status}`});

   } catch (error) {
      console.log("changeStatusEmployeeCase in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeUpdateCaseById = async (req, res) => {
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if(employee?.type?.toLowerCase()!="operation"){
         return res.status(400).json({success: false, message:"Access denied"})
      }

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const mycase = await Case.findById(_id)
      if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })

      const { error } = validateAddClientCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const newDoc = req?.body?.caseDocs?.filter(doc=>doc?.new)
      const oldDoc = req?.body?.caseDocs?.filter(doc=>!doc?.new)

      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body,caseDocs:oldDoc } }, { new: true })
      if (!updateCase) return res.status(404).json({ success: true, message: "Case not found"});

      await Promise.all(newDoc?.map(async (doc) => {
         const newDoc = new CaseDoc({
           name: doc?.docName,
           type: doc?.docType,
           format: doc?.docFormat,
           url: doc?.docURL,
           employeeId: req?.user?._id,
           caseId: updateCase?._id?.toString(),
         })
         return newDoc.save()
       }))
      return res.status(200).json({ success: true, message: "Successfully update case", data: updateCase });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeEditClient = async (req, res, next) => {
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if(employee?.type?.toLowerCase()!="operation"){
         return res.status(400).json({success: false, message:"Access denied"})
      }

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

     const { error } = validateClientProfileBody(req.body);
     if (error) return res.status(400).json({ success: false, message: error.details[0].message })
     const updateClientDetails = await Client.findByIdAndUpdate(_id, {
       $set: {
         isProfileCompleted: true,
         "profile.profilePhoto": req.body.profilePhoto,
         "profile.consultantName": req.body.consultantName,
         "profile.fatherName": req.body.fatherName,
         "profile.alternateEmail": req.body.alternateEmail,
         "profile.primaryMobileNo": req.body.primaryMobileNo,
         "profile.whatsupNo": req.body.whatsupNo,
         "profile.alternateMobileNo": req.body.alternateMobileNo,
         "profile.dob": req.body.dob,
         "profile.address": req.body.address,
         "profile.state": req.body.state,
         "profile.city": req.body.city,
         "profile.pinCode": req.body.pinCode,
         "profile.about": req.body.about,
         "profile.kycPhoto":req?.body?.kycPhoto,
         "profile.kycAadhaar":req?.body?.kycAadhaar,
         "profile.kycAadhaarBack":req?.body?.kycAadhaarBack,
         "profile.kycPan":req?.body?.kycPan,
       }
     }, { new: true })
    
     if(!updateClientDetails){
      return res.status(400).json({ success: true, message: "Client not found"})
     }
     return res.status(200).json({ success: true, message: "Successfully Update Client",_id:updateClientDetails?._id})
   } catch (error) {
     console.log("updateClientDetails: ", error);
     return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
 }

 export const employeeupdateParnterProfile =async (req,res)=>{
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if(employee?.type?.toLowerCase()!="operation"){
         return res.status(400).json({success: false, message:"Access denied"})
      }

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

     const {error} = validateProfileBody(req.body);
     if(error) return res.status(400).json({success:false,message:error.details[0].message})
     const updatePatnerDetails = await Partner.findByIdAndUpdate(_id,{
       $set:{
         "profile.profilePhoto":req.body.profilePhoto,
         "profile.consultantName":req.body.consultantName,
         "profile.alternateEmail": req.body.alternateEmail,
         "profile.alternateMobileNo":req.body.alternateMobileNo,
         "profile.primaryMobileNo":req.body.primaryMobileNo,
         "profile.whatsupNo":req.body.whatsupNo,
         "profile.panNo":req.body.panNo,
         "profile.aadhaarNo":req.body.aadhaarNo ,
         "profile.dob":req.body.dob,
         "profile.designation":req.body.designation,
         "profile.areaOfOperation":req.body.areaOfOperation ,
         "profile.workAssociation": req.body.workAssociation,
         "profile.state":req.body.state,
         "profile.gender":req.body.gender ,
         "profile.district":req.body.district ,
         "profile.city":req.body.city ,
         "profile.pinCode":req.body.pinCode ,
         "profile.about":req.body.about,
         "profile.kycPhoto":req?.body?.kycPhoto,
         "profile.kycAadhaar":req?.body?.kycAadhaar,
         "profile.kycPan":req?.body?.kycPan,
         "profile.kycAadhaarBack":req?.body?.kycAadhaarBack,
       }},{new: true})

       if(!updatePatnerDetails) return res.status(400).json({success: true, message: "Partner not found"})
     return  res.status(200).json({success: true, message: "Successfully update partner profile"})
   } catch (error) {
     console.log("updatePatnerDetails: ",error);
     return res.status(500).json({success: false,message:"Internal server error",error: error});
   }
   }  

   export const employeeUpdatePartnerBankingDetails =async (req,res)=>{
      try {
         const verify = await authEmployee(req, res)
         if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
   
         const employee = await Employee.findById(req?.user?._id)
         if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
         if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
         if(employee?.type?.toLowerCase()!="operation"){
            return res.status(400).json({success: false, message:"Access denied"})
         }
   
         const { _id } = req.query
         if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
   
        const {error} = validateBankingDetailsBody(req.body);
        if(error) return res.status(400).json({success:false,message:error.details[0].message})

        const updatePatnerDetails = await Partner.findByIdAndUpdate(_id,{
          $set:{
           "bankingDetails.bankName": req.body.bankName,
           "bankingDetails.bankAccountNo": req.body.bankAccountNo,
           "bankingDetails.bankBranchName": req.body.bankBranchName,
           "bankingDetails.gstNo": req.body.gstNo,
           "bankingDetails.panNo":req.body.panNo,
           "bankingDetails.cancelledChequeImg": req.body.cancelledChequeImg,
           "bankingDetails.gstCopyImg":req.body.gstCopyImg,
           "bankingDetails.ifscCode":req.body.ifscCode,
           "bankingDetails.upiId":req.body.upiId,
    
          }},{new: true})
          if(!updatePatnerDetails) return res.status(400).json({success: true, message: "Partner not found"})
        return  res.status(200).json({success: true, message: "Successfully update banking details"})
      } catch (error) {
        console.log("updatePatnerDetails: ",error);
        return res.status(500).json({success: false,message:"Internal server error",error: error});
      }
      }



export const viewAllEmployeeCase = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})

         // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const caseAccess = ["operation","finance"]
      const empSaleId =  req?.user?.empType?.toLowerCase()=="sales" ? req?.user?._id :false

      // console.log("empSaleId",empSaleId);

      const empId = !caseAccess?.includes(req?.user?.empType?.toLowerCase()) ?  req?.user?._id : false
      const query = getAllCaseQuery(statusType,searchQuery,startDate,endDate,false,false,empId,true,empSaleId)
      if(!query.success) return res.status(400).json({success: false, message: query.message})

      const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
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
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})



      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
  
      const getCase = await Case.findById(_id).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails")
      if(!getCase) return res.status(404).json({success: false, message:"Case not found"})
      const getCaseDoc = await CaseDoc.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId")
      const getCaseStatus = await CaseStatus.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId")
      const getCaseComment = await CaseComment.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true })
      const getCaseJson = getCase.toObject()
      getCaseJson.caseDocs = getCaseDoc
      getCaseJson.processSteps = getCaseStatus
      getCaseJson.caseCommit = getCaseComment
    return res.status(200).json({success:true,message:"get case data",data:getCaseJson});
     
   } catch (error) {
      console.log("updateAdminCase in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}


export const employeeViewAllPartner = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})

      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
      const searchQuery = req.query.search ? req.query.search : "";
      const empSaleId =  req?.user?.empType?.toLowerCase()=="sales" ? req?.user?._id :false

   const query = getAllPartnerSearchQuery(searchQuery,true,empSaleId)
   if(!query.success) return res.status(400).json({success:false,message:query.message})
   const getAllPartner = await Partner.find(query.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: 1 });
   const noOfPartner = await Partner.find(query.query).count()
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
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})


      
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
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})

         // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo-1)*pageItemLimit :0;
      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

   const query = getAllClientSearchQuery(searchQuery,true,startDate,endDate)
   if(!query?.success) return res.status(400).json({success:false,message:query.message})
   const getAllClient = await Client.find(query.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: 1 });
   const noOfClient = await Client.find(query.query).count()
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
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})


      
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



export const employeeForgetPassword = async (req, res) => {
   try {
      if (!req.body.email) return res.status(400).json({ success: false, message: "Account email required" })
      const employee = await Employee.find({ email: req.body.email, })
      if (employee.length == 0) return res.status(404).json({ success: false, message: "Account not exist" })
      if (!employee[0]?.isActive) return res.status(401).json({ success: false, message: "Account not active" })


      const jwtToken = await Jwt.sign({ _id: employee[0]?._id, email: employee[0]?.email }, process.env.ADMIN_SECRET_KEY, { expiresIn: '5m' })
      try {
         await sendForgetPasswordMail(req.body.email, `/employee/resetPassword/${jwtToken}`);
         console.log("send forget password employee");
         res.status(201).json({ success: true, message: "Successfully send forget password mail" });
      } catch (err) {
         console.log("send forget password mail error", err);
         return res.status(400).json({ success: false, message: "Failed to send forget password mail" });
      }

   } catch (error) {
      console.log("get all client case in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeResetForgetPassword = async (req, res) => {
   try {
      const { error } = validateResetPassword(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      const { password, confirmPassword } = req.body
      if (password != confirmPassword) return res.status(400).json({ success: false, message: "Confirm password must be same" })
      const { verifyId } = req.query
      console.log("verifyId", verifyId);
      try {
         await Jwt.verify(verifyId, process.env.ADMIN_SECRET_KEY)
         const decode = await jwtDecode(verifyId)
         const bcryptPassword = await bcrypt.hash(req.body.password, 10)
         const employee = await Employee.findById(decode?._id)
         if (!employee?.isActive || !employee) return res.status(404).json({ success: false, message: "Account is not active" })
         const forgetPasswordClient = await Employee.findByIdAndUpdate(decode?._id, { $set: { password: bcryptPassword } })
         if (!forgetPasswordClient) return res.status(404).json({ success: false, message: "Account not exist" })
         return res.status(200).json({ success: true, message: "Successfully reset password" })
      } catch (error) {
         return res.status(401).json({ success: false, message: "Invalid/expired link" })
      }

   } catch (error) {
      console.log("get all employee case in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeAddCaseComment = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})


      if(!req?.body?.Comment) return res.status(400).json({success: false, message:"Case Comment required"})
      if(!validMongooseId(req.body._id)) return res.status(400).json({success: false, message:"Not a valid id"})
      

      // const newCommit = {
      //    _id:req?.user?._id,
      //    role:req?.user?.role,
      //    name:req?.user?.fullName,
      //    type:req?.user?.empType,
      //    commit:req?.body?.Comment,Date:new Date()}      
      const getCase = await Case.findById(req.body._id)
      if(!getCase) return res.status(400).json({success: false, message:"Case not found"})

      const newComment = new CaseComment({
         role:req?.user?.role,
         name:req?.user?.fullName,
         type:req?.user?.empType,
         message:req?.body?.Comment,
         caseId:getCase?._id?.toString(),
         employeeId:req?.user?._id,
      })
      await newComment.save()

      return  res.status(200).json({success: true, message: "Successfully add case commit"});
   } catch (error) {
      console.log("employeeAddCaseCommit in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}


export const employeeCreateInvoice = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})
   
      const {clientId,caseId} = req.query
      console.log(clientId,caseId);
      if(!validMongooseId(clientId) || !validMongooseId(caseId)) return res.status(400).json({ success: false, message: "caseId and clientId must be valid" })

      const getClient = await Client.findById(clientId)
      if(!getClient) return res.status(400).json({ success: false, message: "Client not found" })
      const getCase = await Case.findById(caseId)
      if(!getCase) return res.status(400).json({ success: false, message: "Case not found" })

      const { error } = validateInvoice(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const billCount = await Bill.find({}).count()
      const newInvoice = new Bill({...req.body,caseId,clientId,invoiceNo:`ACS-${billCount+1}`})
      newInvoice.save()
      return  res.status(200).json({success: true, message: "Successfully create invoice",_id:newInvoice?._id});
   } catch (error) {
      console.log("employee-create invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const employeeViewAllInvoice = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})

      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type

      const query = getAllInvoiceQuery(searchQuery, startDate, endDate,false,type)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const aggregationPipeline = [
         { $match: query.query }, // Match the documents based on the query
         {
           $group: {
             _id: null,
             totalAmtSum: { $sum: "$totalAmt" } // Calculate the sum of totalAmt
           }
         }
       ];

      const getAllBill = await Bill.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("transactionId");
      const noOfBill = await Bill.find(query?.query).count()
      const aggregateResult = await Bill.aggregate(aggregationPipeline);
      return res.status(200).json({ success: true, message: "get case data", data: getAllBill, noOf: noOfBill,totalAmt:aggregateResult});

   } catch (error) {
      console.log("employee-get invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const employeeViewInvoiceById = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Admin account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})


      
      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
  
      const getInvoice = await Bill.findById(_id)
      if(!getInvoice) return res.status(404).json({success: false, message:"Invoice not found"})
    return res.status(200).json({success:true,message:"get invoice by id data",data:getInvoice});
     
   } catch (error) {
      console.log("employeeViewPartnerById in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeDownloadInvoiceById = async(req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Admin account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})


      
      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
  
      const getInvoice = await Bill.findById(_id)
      if(!getInvoice) return res.status(404).json({success: false, message:"Invoice not found"})
      const pdfResult = await invoiceHtmlToPdfBuffer('./views/invoice.ejs',getInvoice)
      res.setHeader('Content-Disposition','attachment;filename="invoice.pdf"')
      res.setHeader('Content-Type','application/pdf');
      res.status(200)
      res.send(pdfResult)
     
   //  return res.status(200).json({success:true,message:"download invoice by id data",data:pdfResult});
     
   } catch (error) {
      console.log("employeeDownloadInvoiceById in error:",error);
      res.status(500).json({success:false,message:"Internal server error",error:error});
      
   }
}

export const employeeEditInvoice = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})

      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const { error } = validateInvoice(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const getInvoice = await Bill.findById(_id)
      if(!getInvoice?.isPaid){
         const invoice = await Bill.findByIdAndUpdate(_id,{$set:req?.body}) 
         return  res.status(200).json({success: true, message: "Successfully update invoice"});
      }else{
         return  res.status(400).json({success: true, message: "Paid invoice not be editable"});
      }
   } catch (error) {
      console.log("employee-create invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const employeeUnActiveInvoice = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})

      const {_id,type} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
      const invoice = await Bill.findByIdAndUpdate(_id,{$set:{isActive: type==true ? false : true}}) 

      return  res.status(200).json({success: true, message: `Successfully ${type!=true ? "remove" : "restore"} invoice`});
   } catch (error) {
      console.log("employee-remove invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const employeeRemoveInvoice = async (req,res)=>{
   try {
      const verify =  await authEmployee(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const employee = await Employee.findById(req?.user?._id)
      if(!employee) return res.status(401).json({success: false, message:"Employee account not found"})
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})
      if(employee?.type?.toLowerCase()!="finance") return res.status(400).json({success: false, message:"Access Denied"})

      const {_id,type} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const invoice = await Bill.findByIdAndDelete(_id) 

      return  res.status(200).json({success: true, message: `Successfully delete invoice`});
   } catch (error) {
      console.log("admin-delete invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}



export const allEmployeeDashboard = async (req, res) => {
   try {
      const verify = await authEmployee(req, res);
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message });
      const employee = await Employee.findById(req?.user?._id).select("-password")
      if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      if(!employee?.isActive) return res.status(401).json({success: false, message:"Employee account not active"})

      const empSaleId = employee?.type?.toLowerCase() === "sales" ? req?.user?._id : false;
      const filter = empSaleId ? { salesId: empSaleId,isActive:true } : { isActive: true };
      const noOfPartner = await Partner.find(filter).count();
      const currentYearStart = new Date(new Date().getFullYear(), 0, 1); // Start of the current year
      const currentMonth = new Date().getMonth() + 1;
      console.log("start", currentMonth, currentYearStart);
      const allMonths = [];
      for (let i = 0; i < currentMonth; i++) {
         allMonths.push({
            _id: {
               year: new Date().getFullYear(),
               month: i + 1
            },
            totalCases: 0
         });
      }

      let matchStage = {
         'createdAt': { $gte: currentYearStart },
         'isActive': true,
         'isPartnerReferenceCase': false,
         'isEmpSaleReferenceCase': false
       };
       
       if (empSaleId) {
         matchStage['empSaleId'] = empSaleId;
       }
       
      const pieChartData = await Case.aggregate([
         {
            '$match': matchStage
         },
         {
            '$group': {
               '_id': '$currentStatus',
               'totalCases': {
                  '$sum': 1
               },
               'totalCaseAmount': {
                 '$sum': '$claimAmount' // Assuming 'amount' is the field to sum
               }
            }
         },
         {
            '$group': {
               '_id': null,
               'totalCase': {
                  '$sum': '$totalCases'
               },
               'totalCaseAmount': {
                  '$sum': '$totalCaseAmount'
                },
               'allCase': {
                  '$push': '$$ROOT'
               }
            }
         }
      ]);

      const graphData = await Case.aggregate([
         {
            '$match': matchStage
         },
         {
            $group: {
               _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
               },
               totalCases: { $sum: 1 }
            }
         },
         {
            $sort: { '_id.year': 1, '_id.month': 1 }
         },])

      // Merge aggregated data with the array representing all months
      const mergedGraphData = allMonths.map((month) => {
         const match = graphData.find((data) => {
            return data._id.year === month._id.year && data._id.month === month._id.month;
         });
         return match || month;
      });
      return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData,noOfPartner,employee });
   } catch (error) {
      console.log("get dashbaord data error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
};

export const saleEmployeeAddPartner = async (req, res) => {
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if(employee?.type?.toLowerCase()!="sales"){
         return res.status(400).json({success: false, message:"Access denied"})
      }

      const { error } = validateAddPartner(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const isPartnerExist = await Partner.find({email:req.body.email})
      if(isPartnerExist?.length>0 && isPartnerExist[0]?.emailVerify){
         return res.status(400).json({ success: true, message: "Partner account already exist",});
      }

      const jwtString = await Jwt.sign({ ...req.body,empId:req?.user?._id},process.env.EMPLOYEE_SECRET_KEY,{expiresIn:'24h'})
      
      const requestLink = `/partner/accept-request/${jwtString}`
      await sendAddPartnerRequest(req.body.email,requestLink)
      return res.status(200).json({ success: true, message: "Successfully send add partner request"});

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const saleEmployeeAddCase = async (req, res) => {
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if(employee?.type?.toLowerCase()!="sales"){
         return res.status(400).json({success: false, message:"Access denied"})
      }

      const { error } = validateAddEmpCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const {partnerEmail,partnerCode} = req.body
      if(partnerEmail || partnerCode){
         if(!partnerEmail)  return res.status(400).json({success: false, message:"Partner Email is required"})
         const getPartner = await Partner.find({email:partnerEmail})
         if(getPartner?.length==0){
            return res.status(400).json({success: false, message:"Partner not found"})
         }else{
            if(getPartner[0]?.profile?.consultantCode!=partnerCode) return res.status(400).json({success: false, message:"Incorrect email/ consultantCode"})
            req.body.partnerId=getPartner[0]?._id
            req.body.partnerName=getPartner[0]?.profile?.consultantName
         }
      }

      req.body.empSaleId=employee?._id,
      req.body.empSaleName=employee?.fullName,
      req.body.caseFrom = "sale"
      // req.body.processSteps = [{
      //   date: Date.now(),
      //   remark: "pending stage.",
      //   consultant: "",
      // }]
      const newAddCase = new Case({...req.body,caseDocs:[]})
      const noOfCase = await Case.count()
      newAddCase.fileNo = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfCase + 1}`
      await newAddCase.save()

      const defaultStatus = new CaseStatus({
         caseId: newAddCase?._id?.toString()
       })
       await defaultStatus.save()
   
       await Promise.all(req?.body?.caseDocs?.map(async (doc) => {
         const newDoc = new CaseDoc({
           name: doc?.docName,
           type: doc?.docType,
           format: doc?.docFormat,
           url: doc?.docURL,
           employeeId: req?.user?._id,
           caseId: newAddCase?._id?.toString(),
         })
         return newDoc.save()
       }))
      return res.status(200).json({ success: true, message: "Successfully add case",data:newAddCase});

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const salesDownloadCaseReport = async (req, res) => {
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      if(!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      const empSaleId =  req?.user?.empType?.toLowerCase()=="sales" ? req?.user?._id :false

 
       // query = ?statusType=&search=&limit=&pageNo
       const searchQuery = req.query.search ? req.query.search : "";
       const statusType = req.query.status ? req.query.status : "";
       const startDate = req.query.startDate ? req.query.startDate : "";
       const endDate = req.query.endDate ? req.query.endDate : "";
       const type = req?.query?.type ? req.query.type : true
 
       const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type,empSaleId)
       if (!query.success) return res.status(400).json({ success: false, message: query.message })
       const getAllCase = await Case.find(query?.query).sort({ createdAt: -1 });
 
       const excelBuffer = await getDownloadCaseExcel(getAllCase)
       res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
       res.status(200)
       res.send(excelBuffer)
 
   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
 
   }
 }