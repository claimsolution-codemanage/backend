import Employee from "../models/employee.js";
import Partner from "../models/partner.js";
import Client from "../models/client.js";
import Case from "../models/case.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import CaseComment from "../models/caseComment.js";
import Statement from "../models/statement.js";
import Notification from "../models/notification.js";
import CasePaymentDetails from "../models/casePaymentDetails.js";
import CasegroStatus from "../models/groStatus.js";
import CaseOmbudsmanStatus from "../models/ombudsmanStatus.js";
import ShareSection from "../models/shareSection.js";
import Bill from "../models/bill.js";
import bcrypt from 'bcrypt'
import Jwt from "jsonwebtoken";
import { validateEmployeeSignIn, validateEmployeeResetPassword, validateUpdateEmployeeCase, validateAddPartner, validateAddEmpCase, validateEmployeeSignUp, validateSathiTeamSignUp, validateEmployeeUpdate } from "../utils/validateEmployee.js";
import { authEmployee, authPartner } from "../middleware/authentication.js";
import { validMongooseId, getAllCaseQuery, getAllPartnerSearchQuery, generatePassword, getDownloadCaseExcel, getAllPartnerDownloadExcel, getAllEmployeeSearchQuery, getValidateDate, getEmployeeByIdQuery, getAllSathiDownloadExcel, getAllClientDownloadExcel, commonInvoiceDownloadExcel, sendNotificationAndMail, getAllStatementDownloadExcel, commonDownloadCaseExcel, getAllClientResult, getAllPartnerResult } from "../utils/helper.js";
import * as dbFunction from "../utils/dbFunction.js"
import { sendAddClientRequest, sendEmployeeSigninMail, sendForgetPasswordMail } from "../utils/sendMail.js";
import { validateAddClientCase, validateClientProfileBody } from "../utils/validateClient.js";
import jwtDecode from "jwt-decode";
import { validateInvoice } from "../utils/validateEmployee.js";
import { invoiceHtmlToPdfBuffer } from "../utils/createPdf/invoice.js";
import { validateBankingDetailsBody, validateProfileBody } from "../utils/validatePatner.js";
import { sendAddPartnerRequest } from "../utils/sendMail.js";
import { firebaseUpload,getAllInvoiceQuery,validateResetPassword } from "../utils/helper.js";
import { validateAdminAddEmployeeToCase, validateAdminSharePartner } from "../utils/validateAdmin.js";
import { createOrUpdateCaseStatusForm } from "../utils/dbFunction.js";
import { Types } from "mongoose";
import CaseMergeDetails from "../models/caseMergeDetails.js";

export const employeeAuthenticate = async (req, res) => {
   try {
      const verify = await authEmployee(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
      const employee = await Employee.findById(req?.user?._id)
      if (!employee) return res.status(401).json({ success: false, message: "Account not found" })

      if (!employee?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

      return res.status(200).json({ success: true, message: "Authorized Client" })
   } catch (error) {
      console.log("employee auth error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeUploadImage = async (req, res) => {
   try {
      const { employee } = req
      firebaseUpload(req, res, "images");
   } catch (error) {
      console.log("employeeUploadImage", error);
      return res.status(500).json({ success: false, message: "Oops something went wrong" });
   }
}

export const employeeUploadAttachment = async (req, res) => {
   try {
      const { employee } = req
      firebaseUpload(req, res, "attachments");
   } catch (error) {
      console.log("employeeUploadAttachment", error);
      return res.status(500).json({ success: false, message: "Oops something went wrong" });
   }
}




export const employeeSignin = async (req, res) => {
   try {
      const { error } = validateEmployeeSignIn(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const employee = await Employee.find({ email: req?.body?.email?.toLowerCase() })
      if (employee.length == 0) return res.status(401).json({ success: false, message: "Employee account not exists" })

      if (!employee?.[0]?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const checkAuthEmployee = await bcrypt.compare(req.body.password, employee[0].password)
      if (!checkAuthEmployee) return res.status(401).json({ success: false, message: "invaild email/password" })
      // console.log("employee",employee);
      const token = await employee[0]?.getAuth(true)

      return res.status(200).header("x-auth-token", token)
         .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully signIn" })
   } catch (error) {
      console.log("sign in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empProfile = async (req, res) => {
   try {
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ status: false, message: "Not a valid Id" })

      const getEmp = await Employee.findById(_id).select("-password")
      if (!getEmp) return res.status(400).json({ success: false, message: "Employee account not found" })

      return res.status(200).json({ success: true, data: getEmp })

   } catch (error) {
      console.log("adminChangeBranch in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const updateEmployeeAccount = async (req, res) => {
   try {
      const { employee } = req
      const { _id } = req.query
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })

      const { error } = validateEmployeeUpdate(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const updateEmployee = await Employee.findByIdAndUpdate(_id, {
         $set: {
            fullName: req?.body?.fullName?.trim(),
            type: req?.body?.type,
            branchId: req.body?.branchId?.trim(),
            designation: req?.body?.designation?.trim(),
            bankName: req?.body?.bankName?.trim(),
            bankBranchName: req?.body?.bankBranchName?.trim(),
            bankAccountNo: req?.body?.bankAccountNo?.trim(),
            panNo: req?.body?.panNo?.trim(),
            address: req?.body?.address?.trim(),
         }
      })
      if (!updateEmployee) return res.status(401).json({ success: false, message: "Employee not found" })
      return res.status(200).json({ success: true, message: "Successfully update Employee" });



   } catch (error) {
      console.log("updateEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const createSathiTeamAcc = async (req, res) => {
   try {
      const { employee } = req
      const empAccess = ["branch", "sales"]
      if (!empAccess.includes(employee?.type?.toLowerCase())) return res.status(400).json({ success: false, message: "Access denied" })


      const { error } = validateSathiTeamSignUp(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const existEmployee = await Employee.find({ email: { $regex: req.body.email, $options: "i" } })
      if (existEmployee.length > 0) return res.status(401).json({ success: false, message: "Employee account already exists" })

      const lastSathiTeam = await Employee.findOne({ type: "Sathi Team" })

      const noOfEmployee = await Employee.find({}).count()
      const systemPassword = generatePassword()
      const bcryptPassword = await bcrypt.hash(systemPassword, 10)
      const newEmployee = new Employee({
         fullName: req.body.fullName,
         empId: `STM-24${noOfEmployee < 10 ? "0" : ""}${noOfEmployee + 1}`,
         branchId: employee?.branchId?.trim(),
         email: req?.body?.email?.trim()?.toLowerCase(),
         mobileNo: req.body.mobileNo,
         password: bcryptPassword,
         type: "Sathi Team",
         designation: "Executive",
         referEmpId: employee?._id
      })
      try {
         await sendEmployeeSigninMail(req.body.email, systemPassword);
         // console.log(systemPassword,"systemPassword---------");
         await newEmployee.save()
         return res.status(200).json({ success: true, message: "Successfully add sathi team", });
      } catch (err) {
         console.log("send otp error", err);
         return res.status(400).json({ success: false, message: "Failed to send OTP" });
      }


   } catch (error) {
      console.log("createEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empOpPaidInvoice = async (req, res) => {
   try {
      const { employee } = req
      // const verify =  await authEmployee(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })


      const { _id } = req.body;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { remark } = req.body
      if (!remark) return res.status(400).json({ success: false, message: "Remark is required" })

      const getInvoice = await Bill.findById(_id)
      if (!getInvoice?.isPaid) {
         const invoice = await Bill.findByIdAndUpdate(_id, { $set: { remark: remark, isPaid: true, paidBy: "operation", paidDate: new Date() } })
         return res.status(200).json({ success: true, message: "Successfully paid invoice" });
      } else {
         return res.status(400).json({ success: true, message: "Invoice already paid" });
      }


   } catch (error) {
      console.log("emp-op-Paid-Invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const empOpGetSaleEmployee = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })

      let {limit,search,pageNo} = req.query
      const pageItemLimit = limit || 50;
      pageNo = pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = search || "";

      const pipeline =[
         {
           $match: {
             isActive: true,
             type: { $regex: "sales", $options: "i", },
             branchId: { $regex: employee?.branchId || "",  $options: "i",  },
             $or: [
               {fullName: {$regex: searchQuery, $options: "i", },  },
               {email: {$regex: searchQuery, $options: "i", },  },
               {mobileNo: {$regex: searchQuery, $options: "i", },  },
               {type: {$regex: searchQuery, $options: "i", },  },
               {designation: {$regex: searchQuery, $options: "i", },  },
             ],
           },
         },
         {
           $project: {
             fullName: 1,
             email: 1,
             mobileNo: 1,
             type: 1,
             designation: 1,
             branchId: 1,
           },
         },
         {
           $facet: {
             data: [
               {$sort: { createdAt: -1, }, },
               { $skip: 0, },
               { $limit: 10, },
             ],
             totalCount: [
               {$count: "count",  },
             ],
           },
         },
       ]
      const result = await Employee.aggregate(pipeline)
      return res.status(200).json({ success: true, message: "get sale employee data", data: result?.[0]?.data || [], noOfEmployee: result?.[0]?.totalCount?.[0]?.count || 0 });

   } catch (error) {
      console.log("empop sale emp in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empOpCreateOrUpdateCaseForm = async (req, res, next) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })

      await createOrUpdateCaseStatusForm(req, res, next)
   } catch (error) {
      console.log("empop sale emp in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

// old version
// export const empOpSharePartnerToSaleEmp = async (req, res) => {
//    try {
//       const { employee } = req
//       if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })


//       const { error } = validateAdminSharePartner(req.body)
//       if (error) return res.status(400).json({ success: false, message: error.details[0].message })

//       const updatePartners = req.body?.sharePartners?.map(async (casePartners) => {
//          const getPartner = await Partner.findById(casePartners)
//          if (getPartner) {
//             const filterShareEmp = req.body.shareEmployee.filter(empId => !getPartner?.shareEmployee?.includes(empId));
//             return Partner.findByIdAndUpdate(casePartners, { $push: { shareEmployee: { $each: filterShareEmp } } }, { new: true })
//          }
//       })
//       try {
//          const allUpdatePartner = await Promise.all(updatePartners)
//          return res.status(200).json({ success: true, message: "Successfully share partner" });
//       } catch (error) {
//          return res.status(400).json({ success: false, message: "Failed to share" })
//       }
      

//    } catch (error) {
//       console.log("empOp share partner in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }

// new version
export const empOpSharePartnerToSaleEmp = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })


      const { error } = validateAdminSharePartner(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      const {sharePartners=[],shareEmployee=[]} = req.body
      // let bulkOps = []
      // for (const toEmployeeId of shareEmployee) {
      //    const exists = await ShareSection.find({toEmployeeId,partnerId:{$in:sharePartners}},{partnerId:1})
      //    let filter = sharePartners?.filter(partnerId=>!exists?.map(ele=>ele?.partnerId?.toString())?.includes(partnerId)) 
      //    filter?.forEach(partnerId=>{
      //       bulkOps.push({
      //          insertOne:{
      //             document:{
      //                partnerId,
      //                toEmployeeId
      //             }
      //          }
      //       })
      //    })
      // }   
      // await ShareSection.bulkWrite(bulkOps)
      
      // show in added by
      if(!shareEmployee[0]) return res.status(400).json({ success: true, message: "Please add employee to share" });
      await Partner.updateMany({_id:{$in:sharePartners}},{$set:{salesId:shareEmployee[0]}})
      return res.status(200).json({ success: true, message: "Successfully share partner" });

   } catch (error) {
      console.log("empOp share partner in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong!", error: error });
   }
}

export const empOpShareClientToSaleEmp = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") return res.status(401).json({ success: false, message: "Access denied" })

      const {shareClients=[],shareEmployee=[]} = req.body
      let bulkOps = []
      for (const toEmployeeId of shareEmployee) {
         const exists = await ShareSection.find({toEmployeeId,clientId:{$in:shareClients}},{clientId:1})
         let filter = shareClients?.filter(clientId=>!exists?.map(ele=>ele?.clientId?.toString())?.includes(clientId)) 
         filter?.forEach(clientId=>{
            bulkOps.push({
               insertOne:{
                  document:{
                     clientId,
                     toEmployeeId
                  }
               }
            })
         })
      }   
      await ShareSection.bulkWrite(bulkOps)
      return res.status(200).json({ success: true, message: "Successfully share clients" });

   } catch (error) {
      console.log("empOp share client in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const employeeResetPassword = async (req, res) => {
   try {
      const { employee } = req
      const { error } = validateEmployeeResetPassword(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      const { password, confirmPassword } = req.body
      if (password !== confirmPassword) return res.status(403).json({ success: false, message: "confirm password must be same" })
      const bcryptPassword = await bcrypt.hash(password, 10)

      const updateAdmin = await Employee.findByIdAndUpdate(req?.user?._id, { $set: { password: bcryptPassword } }, { new: true })
      if (!updateAdmin) return res.status(400).json({ success: false, message: "Employee not found" })

      return res.status(200).json({ success: true, message: "Successfully reset password" })
   } catch (error) {
      console.log("employeeResetPassword error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const changeStatusEmployeeCase = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(400).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { error } = validateUpdateEmployeeCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      console.log("case body", req.body);

      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const updateCase = await Case.findByIdAndUpdate(req.body._id, { currentStatus: req.body.status }, { new: true })
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      const addNewStatus = new CaseStatus({
         remark: req.body.remark,
         status: req.body.status,
         consultant: employee?.fullName,
         employeeId: req?.user?._id,
         caseId: req.body._id
      })
      await addNewStatus.save()

      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${req.body._id}`
      const notificationAdminUrl = `/admin/view case/${req.body._id}`

      sendNotificationAndMail(
         req.body._id,
         `Case file No. ${updateCase.fileNo} status mark as ${req.body.status}`,
         employee?.branchId,
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )
      return res.status(200).json({ success: true, message: `Case status change to ${req.body.status}` });

   } catch (error) {
      console.log("changeStatusEmployeeCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeUpdateCaseById = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const mycase = await Case.findById(_id)
      if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })

      const { error } = validateAddClientCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const newDoc = req?.body?.caseDocs?.filter(doc => doc?.new)

      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body, caseDocs: [] } }, { new: true })
      if (!updateCase) return res.status(404).json({ success: true, message: "Case not found" });

      let bulkOps = [];

      newDoc?.forEach((doc) => {
         bulkOps.push({
            insertOne: {
               document: {
                  name: doc?.docName,
                  type: doc?.docType,
                  format: doc?.docFormat,
                  url: doc?.docURL,
                  employeeId: req?.user?._id,
                  isPrivate: doc?.isPrivate,
                  caseId: updateCase?._id?.toString(),
               }
            }
         });
      });

      bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${updateCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${updateCase?._id?.toString()}`

      sendNotificationAndMail(
         updateCase?._id?.toString(),
         `Update on  Case file No.  ${updateCase?.fileNo}`,
         employee?.branchId,
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )
      return res.status(200).json({ success: true, message: "Successfully update case", });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeEditClient = async (req, res, next) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
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
            "profile.kycPhoto": req?.body?.kycPhoto,
            "profile.kycAadhaar": req?.body?.kycAadhaar,
            "profile.kycAadhaarBack": req?.body?.kycAadhaarBack,
            "profile.kycPan": req?.body?.kycPan,
         }
      }, { new: true })

      if (!updateClientDetails) {
         return res.status(400).json({ success: true, message: "Client not found" })
      }
      return res.status(200).json({ success: true, message: "Successfully Update Client", _id: updateClientDetails?._id })
   } catch (error) {
      console.log("updateClientDetails: ", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeupdateParnterProfile = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { error } = validateProfileBody(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      let isExist = await Partner.findById(_id)
      if (!isExist) return res.status(400).json({ success: true, message: "Partner not found" })
      const updateKeys = ["profilePhoto", "consultantName", "alternateEmail", "alternateMobileNo", "primaryMobileNo", "whatsupNo", "panNo", "aadhaarNo",
         "dob", "designation", "areaOfOperation", "workAssociation", "state", "gender", "district", "city", "address", "pinCode", "about", "kycPhoto",
         "kycAadhaar", "kycPan", "kycAadhaarBack", "companyName", "companyAddress", "officalContactNo", "officalEmailId"
      ]

      updateKeys?.forEach(key => {
         if (req.body[key]) {
            isExist.profile[key] = req.body[key]
         }
      })
      await isExist.save()
      return res.status(200).json({ success: true, message: "Successfully update partner profile" })
   } catch (error) {
      console.log("updatePatnerDetails: ", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeUpdatePartnerBankingDetails = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { error } = validateBankingDetailsBody(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      let isExist = await Partner.findById(_id)
      if (!isExist) return res.status(400).json({ success: true, message: "Partner not found" })
      const updateKeys = ["bankName", "bankAccountNo", "bankBranchName", "gstNo", "panNo", "cancelledChequeImg", "gstCopyImg", "ifscCode", "upiId"]

      updateKeys?.forEach(key => {
         if (req.body[key]) {
            isExist.bankingDetails[key] = req.body[key]
         }
      })
      await isExist.save()
      return res.status(200).json({ success: true, message: "Successfully update banking details" })
   } catch (error) {
      console.log("updatePatnerDetails: ", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const empAddPartnerRefToEmp = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "employee account not active" })

      const { partnerId, empEmail } = req?.body
      if (!partnerId) return res.status(400).json({ success: false, message: "Partner id required" })
      if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid PartnerId" })

      if (!empEmail) return res.status(400).json({ success: false, message: "Employee email is required" })

      const findPartner = await Partner.findById(partnerId)
      if (!findPartner) return res.status(404).json({ success: false, message: "Parnter not found" })

      const findEmp = await Employee.findOne({ email: { $regex: empEmail, $options: "i" } })
      if (!findEmp) return res.status(404).json({ success: false, message: "Employee not found" })

      const updatePartner = await Partner.findByIdAndUpdate(partnerId, { salesId: findEmp._id })
      return res.status(200).json({ success: true, message: "Successfully add employee reference" });

   } catch (error) {
      console.log("empAddPartnerRefToEmp in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

//"old version"
// export const viewAllEmployeeCase = async (req, res) => {
//    try {
//       const { employee } = req
//       const pageItemLimit = req.query.limit ? req.query.limit : 10;
//       const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
//       const searchQuery = req.query.search ? req.query.search : "";
//       const statusType = req.query.status ? req.query.status : "";
//       const startDate = req.query.startDate ? req.query.startDate : "";
//       const endDate = req.query.endDate ? req.query.endDate : "";
//       const caseAccess = ["operation", "finance", "branch"]
//       let empId = req?.query?.empId == "false" ? false : req?.query?.empId;
//       let empBranchId = false;
//       let branchWise = false
//       let findEmp = false
//       let isNormalEmp = false


//       //  for specific employee case 
//       if (empId) {
//          if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id1" })
//          const getEmp = await Employee.findById(empId)
//          if (!getEmp) return res.status(400).json({ success: false, message: "Searching employee account not found" })
//          findEmp = getEmp

//          if (caseAccess?.includes(findEmp?.type?.toLowerCase())) {
//             console.log("if---");
//             empBranchId = getEmp?.branchId
//             branchWise = true
//          } else if (findEmp?.type?.toLowerCase() != "sales" && findEmp?.type?.toLowerCase() != "sathi team" && !empId) {
//             console.log("else---");
//             empId = req.query?.empId
//             empBranchId = employee?.branchId
//             branchWise = true
//             isNormalEmp = true
//          }
//       }

//       if (caseAccess?.includes(req?.user?.empType?.toLowerCase()) && !empId) {
//          empBranchId = employee?.branchId
//          branchWise = true
//          empId = false
//       } else {
//          if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "sathi team" && !empId) {
//             empId = employee?._id?.toString()
//             empBranchId = false
//             branchWise = true
//          }
//       }

//       if (startDate && endDate) {
//          const validStartDate = getValidateDate(startDate)
//          if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
//          const validEndDate = getValidateDate(endDate)
//          if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
//       }

//       const matchQuery = []

//       if (startDate && endDate) {
//          const start = new Date(startDate).setHours(0, 0, 0, 0);
//          const end = new Date(endDate).setHours(23, 59, 59, 999);

//          matchQuery.push({
//             createdAt: {
//                $gte: new Date(start),
//                $lte: new Date(end)
//             }
//          });
//       }

//       if (branchWise) {
//          const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, isNormalEmp && empId, true, false, !isNormalEmp && empBranchId)
//          // if (!query.success) return res.status(400).json({ success: false, message: query.message })

//          // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
//          // const noOfCase = await Case.find(query?.query).count()
//          // return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });

//          if (isNormalEmp && empId) {
//             matchQuery.push({ addEmployee: { $in: empId } })
//          }

//       } else {

//          let extactMatchQuery = [
//             { referEmpId: findEmp?._id ? findEmp?._id : employee?._id },
//             { _id: findEmp?._id ? findEmp?._id : employee?._id }
//          ]

//          if ((!findEmp && employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "manager") ||
//             (findEmp && findEmp?.type?.toLowerCase() == "sales" && findEmp?.designation?.toLowerCase() == "manager")) {
//             extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
//             extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
//          }

//          // console.log("extactMatchQuery----",extactMatchQuery);
//          const extractType = await Employee.aggregate([
//             {
//                $match: {
//                   $or: [
//                      ...extactMatchQuery
//                   ]
//                }
//             },
//             {
//                "$group": {
//                   "_id": null,
//                   "shareEmpStr": { "$push": { "$toString": "$_id" } },
//                   "shareEmpObj": { "$push": "$_id" }
//                }
//             },
//             {
//                "$lookup": {
//                   from: "partners",
//                   let: { shareEmpStr: "$shareEmpStr", shareEmpObj: "$shareEmpObj" },
//                   pipeline: [
//                      {
//                         $match: {
//                            $expr: {
//                               $or: [
//                                  { $in: ["$salesId", "$$shareEmpObj"] }, // Use ObjectId array for salesId
//                                  {
//                                     $gt: [
//                                        {
//                                           $size: {
//                                              $filter: {
//                                                 input: { $ifNull: ["$shareEmployee", []] }, // Ensure shareEmployee is an array
//                                                 as: "shareEmployeeId",
//                                                 cond: { $in: ["$$shareEmployeeId", "$$shareEmpStr"] }
//                                              }
//                                           }
//                                        },
//                                        0
//                                     ]
//                                  }
//                               ]
//                            }
//                         }
//                      }
//                   ],
//                   as: "partners"
//                }
//             },
//             {
//                $lookup: {
//                   from: "clients",
//                   let: { shareEmpObj: "$shareEmpObj" },
//                   pipeline: [
//                      {
//                         $match: {
//                            $expr: {
//                               $or: [
//                                  { $in: ["$salesId", "$$shareEmpObj"] },

//                               ]
//                            }
//                         }
//                      }
//                   ],
//                   as: "allClients"
//                }
//             },
//             {
//                $project: {
//                   shareEmpObj: 1,
//                   _id: 0,
//                   allClients: {
//                      $map: {
//                         input: "$allClients",
//                         as: "allClients",
//                         in: "$$allClients._id"
//                      }
//                   },
//                   allPartners: {
//                      $map: {
//                         input: "$partners",
//                         as: "partner",
//                         in: "$$partner._id"
//                      }
//                   }
//                }
//             },
//             {
//                $project: {
//                   shareEmp: { $map: { input: "$shareEmpObj", as: "id", in: { $toString: "$$id" } } },
//                   allPartners: { $map: { input: "$allPartners", as: "id", in: { $toString: "$$id" } } },
//                   allClients: { $map: { input: "$allClients", as: "id", in: { $toString: "$$id" } } }
//                }
//             }

//          ])
//          console.log("extractType?.[0]",extractType?.[0]);
         

//          matchQuery.push({
//             $or: [
//                { empSaleId: { $in: extractType?.[0]?.shareEmp } },
//                { partnerId: { $in: extractType?.[0]?.allPartners } },
//                { clientId: { $in: extractType?.[0]?.allClients } },
//             ]
//          },)
//       }

//       const pipeline = [
//          {
//             $match: {
//                $and: [
//                   { isPartnerReferenceCase: false },
//                   { isEmpSaleReferenceCase: false },
//                   { currentStatus: { $regex: statusType, $options: "i" } },
//                   { isActive: true },
//                   { branchId: { $regex: employee?.branchId, $options: "i" } },
//                   ...matchQuery,
//                ]
//             }
//          },
//          {
//             $project: {
//                clientId: 1,
//                consultantCode: 1,
//                branchId: 1,
//                partnerId: 1,
//                partnerCode: 1,
//                empSaleId: 1,
//                isActive: 1,
//                caseFrom: 1,
//                name: 1,
//                mobileNo: 1,
//                email: 1,
//                claimAmount: 1,
//                policyNo: 1,
//                fileNo: 1,
//                policyType: 1,
//                complaintType: 1,
//                createdAt: 1,
//                currentStatus: 1
//             }
//          },
//          {
//             $addFields: {
//                validPartnerIdString: {
//                   $cond: {
//                      if: {
//                         $and: [
//                            { $eq: [{ $type: "$partnerId" }, "string"] }, // Ensure partnerId is of type string
//                            { $ne: ["$partnerId", ""] }, // Ensure partnerId is not an empty string
//                            { $eq: [{ $strLenCP: "$partnerId" }, 24] } // Ensure it has exactly 24 characters
//                         ]
//                      },
//                      then: "$partnerId",
//                      else: null
//                   }
//                }
//             }
//          },
//          {
//             $lookup: {
//                from: 'partners',
//                let: { partnerIdString: "$validPartnerIdString" },
//                pipeline: [
//                   {
//                      $match: {
//                         $expr: {
//                            $and: [
//                               { $ne: ["$$partnerIdString", null] }, // Ensure partnerIdString is not null
//                               { $ne: ["$$partnerIdString", ""] }, // Ensure partnerIdString is not an empty string
//                               {
//                                  $eq: [
//                                     "$_id",
//                                     { $toObjectId: "$$partnerIdString" }
//                                  ]
//                               }
//                            ]
//                         }
//                      }
//                   },
//                   {
//                      $project: {
//                         fullName: 1 // Include only the fullName field
//                      }
//                   }
//                ],
//                as: 'partnerDetails'
//             }
//          },
//          {
//             '$unwind': {
//                'path': '$partnerDetails',
//                'preserveNullAndEmptyArrays': true
//             }
//          },
//          {
//             $addFields: {
//                validSaleEmpIdString: {
//                   $cond: {
//                      if: {
//                         $and: [
//                            { $eq: [{ $type: "$empSaleId" }, "string"] }, // Ensure partnerId is of type string
//                            { $ne: ["$empSaleId", ""] }, // Ensure partnerId is not an empty string
//                            { $eq: [{ $strLenCP: "$empSaleId" }, 24] } // Ensure it has exactly 24 characters
//                         ]
//                      },
//                      then: "$empSaleId",
//                      else: null
//                   }
//                }
//             }
//          },
//          {
//             $lookup: {
//                from: 'employees',
//                let: { saleEmpIdString: "$validSaleEmpIdString" },
//                pipeline: [
//                   {
//                      $match: {
//                         $expr: {
//                            $and: [
//                               { $ne: ["$$saleEmpIdString", null] }, // Ensure partnerIdString is not null
//                               { $ne: ["$$saleEmpIdString", ""] }, // Ensure partnerIdString is not an empty string
//                               {
//                                  $eq: [
//                                     "$_id",
//                                     { $toObjectId: "$$saleEmpIdString" }
//                                  ]
//                               }
//                            ]
//                         }
//                      }
//                   },
//                   {
//                      $project: {
//                         fullName: 1, // Include only the fullName field
//                         designation: 1,
//                         type: 1
//                      }
//                   }
//                ],
//                as: 'employeeDetails'
//             }
//          },
//          {
//             '$unwind': {
//                'path': '$employeeDetails',
//                'preserveNullAndEmptyArrays': true
//             }
//          },
//          {
//             '$match': {
//                '$or': [
//                   { name: { $regex: searchQuery, $options: "i" } },
//                   { 'partnerDetails.fullName': { $regex: searchQuery, $options: "i" } },
//                   { 'employeeDetails.fullName': { $regex: searchQuery, $options: "i" } },
//                   { consultantCode: { $regex: searchQuery, $options: "i" } },
//                   { fileNo: { $regex: searchQuery, $options: "i" } },
//                   { email: { $regex: searchQuery, $options: "i" } },
//                   { mobileNo: { $regex: searchQuery, $options: "i" } },
//                   { policyType: { $regex: searchQuery, $options: "i" } },
//                   { policyNo: { $regex: searchQuery, $options: "i" } },
//                   { caseFrom: { $regex: searchQuery, $options: "i" } },
//                   { branchId: { $regex: searchQuery, $options: "i" } },
//                ]
//             }
//          },
//          { '$sort': { 'createdAt': -1 } },
//          {
//             $facet: {
//                cases: [
//                   { $sort: { createdAt: -1 } },
//                   { $skip: Number(pageNo) },
//                   { $limit: Number(pageItemLimit) },
//                   {
//                      $project: {
//                         validSaleEmpIdString: 0,
//                         validPartnerIdString: 0,
//                      }
//                   }
//                ],
//                totalCount: [
//                   { $count: "count" }
//                ]
//             }
//          }
//       ];

//       const result = await Case.aggregate(pipeline);
//       const getAllCase = result[0].cases;
//       const noOfCase = result[0].totalCount[0]?.count || 0;


//       return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });


//    } catch (error) {
//       console.log("updateAdminCase in error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// }

// "new version"
export const viewAllEmployeeCase = async (req, res) => {
   try {
      const { employee } = req
      let { limit = 10, pageNo = 1, search = "", status = "", startDate = "", endDate = "", empId = "",isReject="" } = req.query
      const skip = (pageNo - 1) * limit;
      const caseAccess = ["operation", "finance", "branch"]

      //  for self employee and other employee
      let empDetails = employee
      if (empId && empId != "false") {
         if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id" })
         empDetails = await Employee.findById(empId)
         if (!empDetails) return res.status(400).json({ success: false, message: "Searching employee account not found" })
      }

      const { type, designation } = empDetails
      let matchQuery = []
      let extactMatchQuery = []

      matchQuery.push({ isActive: Boolean(req.query.type == "true" ? true :false) })
      matchQuery.push(isReject=="true" ? {currentStatus:{$in:["Reject"]}} : {currentStatus:{$nin:["Reject"]}})


      // manage role wise other emp case details access
      if (!caseAccess?.includes(type?.toLowerCase()) || (empId && empId != "false")) {
         extactMatchQuery = [
            { referEmpId: empDetails?._id },
            { _id: empDetails?._id }
         ]

         if (type?.toLowerCase() == "sales" && designation?.toLowerCase() == "manager") {
            extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
            extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
         }

         // extract filter options 
         const filterPipeline = [
            {
               "$match": {
                  "$or": [
                     ...extactMatchQuery
                  ]
               }
            },
            {
               "$project": {
                  "referEmpId": 1,
                  "_id": 1,
               },
            },
            {
               "$lookup": {
                  "from": "sharesections",
                  "localField": "_id",
                  "foreignField": "toEmployeeId",
                  "as": "shareSection",
                  "pipeline": [
                     {
                        "$project": {
                           "_id": 1,
                           "partnerId": 1,
                           "caseId": 1,
                           "clientId": 1,
                        },
                     },
                  ],
               },
            },
            {
               "$unwind": {
                  "path": "$shareSection",
                  "preserveNullAndEmptyArrays": true,
               },
            },
            {
               "$lookup": {
                  "from": "partners",
                  "localField": "_id",
                  "foreignField": "salesId",
                  "as": "referPartner",
                  "pipeline": [
                     {
                        "$project": {
                           "_id": 1,
                        },
                     },
                  ],
               }
            },
            {
               "$unwind": {
                  "path": "$referPartner",
                  "preserveNullAndEmptyArrays": true
               }
            },
            {
               "$group": {
                  "_id": null,
                  "empIds": {
                     "$addToSet": "$_id",
                  },
                  "referPartnerIds": { "$addToSet": "$referPartner._id"},
                  "partnerIds": {
                     "$addToSet": "$shareSection.partnerId",
                  },
                  "clientIds": {
                     "$addToSet": "$shareSection.clientId",
                  },
                  "caseIds": {
                     "$addToSet": "$shareSection.caseId",
                  },
               },
            },
            {
               "$addFields": {
                  "allPartnerIds": {
                     "$setUnion": [
                        "$partnerIds",
                        "$referPartnerIds",
                     ],
                  },
               },
            },
         ]

         const extactOptions = await Employee.aggregate(filterPipeline)

         console.log("extactOptions",extactOptions[0]);
         

         matchQuery.push({
            $or: [
               { empObjId: { $in: extactOptions?.[0]?.empIds } },
               // {partnerObjId: { $in: extactOptions?.[0]?.partnerIds } },
               {partnerObjId: { $in: extactOptions?.[0]?.allPartnerIds } },
               { clientObjId: { $in: extactOptions?.[0]?.clientIds } },
               { _id: { $in: extactOptions?.[0]?.caseIds } },
            ]
         },)
      }

      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }
      //  date-wise filter
      if (startDate && endDate) {
         const start = new Date(startDate).setHours(0, 0, 0, 0);
         const end = new Date(endDate).setHours(23, 59, 59, 999);
         matchQuery.push({
            createdAt: {
               $gte: new Date(start),
               $lte: new Date(end)
            }
         });
      }


      const pipeline = [
         {
            "$match": {
               "$and": [
                  { "isPartnerReferenceCase": false },
                  { "isEmpSaleReferenceCase": false },
                  { "currentStatus": { "$regex": status, "$options": "i" } },
                  { "isActive": true },
                  { "branchId": { "$regex": employee?.branchId, "$options": "i" } },
                  ...matchQuery,
               ]
            }
         },
         {
            "$project": {
               "clientId": 1,
               "consultantCode": 1,
               "branchId": 1,
               "partnerId": 1,
               "partnerCode": 1,
               "empSaleId": 1,
               "isActive": 1,
               "caseFrom": 1,
               "name": 1,
               "mobileNo": 1,
               "email": 1,
               "claimAmount": 1,
               "policyNo": 1,
               "fileNo": 1,
               "policyType": 1,
               "complaintType": 1,
               "createdAt": 1,
               "currentStatus": 1,
               "empObjId": 1,
               "partnerObjId": 1,
               "clientObjId": 1,
            }
         },
         {
            "$lookup": {
               "from": 'partners',
               "localField": "partnerObjId",
               "foreignField": "_id",
               "pipeline": [
                  {
                     "$project": {
                        "fullName": 1, // Include only the fullName field,
                        "profile.consultantName":1,
                        "profile.consultantCode":1,
                     }
                  }
               ],
               "as": 'partnerDetails'
            }
         },
         {
            '$unwind': {
               'path': '$partnerDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            "$lookup": {
               "from": 'clients',
               "localField": "clientObjId",
               "foreignField": "_id",
               "pipeline": [
                  {
                     "$project": {
                        "fullName": 1, // Include only the fullName field
                         "profile.consultantName":1,
                        "profile.consultantCode":1,
                     }
                  }
               ],
               "as": 'clientDetails'
            }
         },
         {
            '$unwind': {
               'path': '$clientDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            "$lookup": {
               "from": 'employees',
               "localField": "empObjId",
               "foreignField": "_id",
               "as": 'employeeDetails',
               "pipeline": [
                  {
                     "$project": {
                        "fullName": 1, // Include only the fullName field
                        "designation": 1,
                        "type": 1
                     }
                  }
               ]
            }
         },
         {
            '$unwind': {
               'path': '$employeeDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            '$match': {
               '$or': [
                  { "name": { "$regex": search, "$options": "i" } },
                  { 'partnerDetails.fullName': { "$regex": search, "$options": "i" } },
                  { 'employeeDetails.fullName': { "$regex": search, "$options": "i" } },
                  { "consultantCode": { "$regex": search, "$options": "i" } },
                  { "fileNo": { "$regex": search, "$options": "i" } },
                  { "email": { "$regex": search, "$options": "i" } },
                  { "mobileNo": { "$regex": search, "$options": "i" } },
                  { "policyType": { "$regex": search, "$options": "i" } },
                  { "policyNo": { "$regex": search, "$options": "i" } },
                  { "caseFrom": { "$regex": search, "$options": "i" } },
                  { "branchId": { "$regex": search, "$options": "i" } },
               ]
            }
         },
         { '$sort': { 'createdAt': -1 } },
         {
            "$facet": {
               "cases": [
                  { "$skip": Number(skip) },
                  { "$limit": Number(limit) },
               ],
               "totalCount": [
                  { "$count": "count" }
               ]
            }
         }
      ];

      const result = await Case.aggregate(pipeline);
      const getAllCase = result[0].cases;
      const noOfCase = result[0].totalCount[0]?.count || 0;
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


//old version
// export const employeeViewCaseByIdBy = async (req, res) => {
//    try {
//       const { employee } = req
//       let isOperation = employee?.type?.toLowerCase() == "operation"

//       const { _id } = req.query;
//       if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

//       const getCase = await Case.findById(_id).select("-caseDocs -processSteps -addEmployee -caseCommit").populate("partnerObjId","consultantName consultantCode")
//       if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })
//       const [getCaseDoc, getCaseStatus, getCaseComment, getCasePaymentDetails, getCaseGroDetails, getCaseOmbudsmanDetails] = await Promise.all([
//          CaseDoc.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId"),
//          CaseStatus.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId"),
//          CaseComment.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }),
//          CasePaymentDetails.find({ caseId: getCase?._id, isActive: true }),
//          CasegroStatus.findOne({ caseId: getCase?._id, isActive: true }).populate("paymentDetailsId"),
//          CaseOmbudsmanStatus.findOne({ caseId: getCase?._id, isActive: true }).populate("paymentDetailsId"),
//       ]);

//       // Convert `getCaseGroDetails` to a plain object if it exists
//       const caseGroDetailsObj = getCaseGroDetails ? getCaseGroDetails.toObject() : null;
//       const caseOmbudsmanDetailsObj = getCaseOmbudsmanDetails ? getCaseOmbudsmanDetails.toObject() : null;
//       const getCaseJson = getCase.toObject();
//       getCaseJson.caseDocs = getCaseDoc;
//       getCaseJson.processSteps = getCaseStatus;
//       getCaseJson.caseCommit = getCaseComment;
//       getCaseJson.casePayment = getCasePaymentDetails;

//       //  gro details
//       if (caseGroDetailsObj) {
//          getCaseJson.caseGroDetails = {
//             ...caseGroDetailsObj,
//             groStatusUpdates: caseGroDetailsObj?.groStatusUpdates?.filter(ele => isOperation || ele?.isPrivate) || [],
//             queryHandling: caseGroDetailsObj?.queryHandling?.filter(ele => isOperation || ele?.isPrivate) || [],
//             queryReply: caseGroDetailsObj?.queryReply?.filter(ele => isOperation || ele?.isPrivate) || [],
//             approvalLetter: caseGroDetailsObj?.approvalLetterPrivate ? (isOperation && caseGroDetailsObj?.approvalLetter) : caseGroDetailsObj?.approvalLetter,
//          };
//       } else {
//          getCaseJson.caseGroDetails = caseGroDetailsObj
//       }

//       //  ombudsman status
//       if (caseOmbudsmanDetailsObj) {
//          getCaseJson.caseOmbudsmanDetails = {
//             ...caseOmbudsmanDetailsObj,
//             statusUpdates: caseOmbudsmanDetailsObj?.statusUpdates?.filter(ele => isOperation || ele?.isPrivate) || [],
//             queryHandling: caseOmbudsmanDetailsObj?.queryHandling?.filter(ele => isOperation || ele?.isPrivate) || [],
//             queryReply: caseOmbudsmanDetailsObj?.queryReply?.filter(ele => isOperation || ele?.isPrivate) || [],
//             hearingSchedule: caseOmbudsmanDetailsObj?.hearingSchedule?.filter(ele => isOperation || ele?.isPrivate) || [],
//             awardPart: caseOmbudsmanDetailsObj?.awardPart?.filter(ele => isOperation || ele?.isPrivate) || [],
//             approvalLetter: caseOmbudsmanDetailsObj?.approvalLetterPrivate ? (isOperation && caseOmbudsmanDetailsObj?.approvalLetter) : caseOmbudsmanDetailsObj?.approvalLetter,
//          };
//       } else {
//          getCaseJson.caseOmbudsmanDetails = caseOmbudsmanDetailsObj
//       }

//       return res.status(200).json({ success: true, message: "get case data", data: getCaseJson });

//    } catch (error) {
//       console.log("updateAdminCase in error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// }

// new version
// const mongoose = require("mongoose");

export const employeeViewCaseByIdBy = async (req, res) => {
   try {
      const { employee } = req;
      const isOperation = employee?.type?.toLowerCase() === "operation";
      const { _id } = req.query;

      if (!validMongooseId(_id)) {
         return res.status(400).json({ success: false, message: "Not a valid id" });
      }

      const caseId = new Types.ObjectId(_id);

      const caseData = await Case.aggregate([
         { $match: { _id: caseId } },
         {
            $lookup: {
               from: "partners",
               localField: "partnerObjId",
               foreignField: "_id",
               as: "partnerDetails",
               pipeline:[
                  {
                     $project:{
                        "profile.consultantName":1,
                        "profile.consultantCode":1
                     }
                  }
               ]
            }
         },
         { $unwind: { path: "$partnerDetails", preserveNullAndEmptyArrays: true } },
         {
            $lookup: {
               from: "employees",
               localField: "empObjId",
               foreignField: "_id",
               as: "empDetails",
               pipeline:[
                  {
                     $project:{
                        fullName:1,
                        type:1,
                        designation:1
                     }
                  }
               ]
            }
         },
         { $unwind: { path: "$empDetails", preserveNullAndEmptyArrays: true } },
               {
            $lookup: {
               from: "clients",
               localField: "clientObjId",
               foreignField: "_id",
               as: "clientDetails",
               pipeline:[
                  {
                     $project:{
                         "profile.consultantName":1,
                        "profile.consultantCode":1
                     }
                  }
               ]
            }
         },
         { $unwind: { path: "$clientDetails", preserveNullAndEmptyArrays: true } },
         {
            $lookup: {
               from: "casedocs",
               let: { id: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $or: [
                                 { $eq: ["$caseId", "$$id"] }, 
                                 { $eq: ["$caseMargeId", { "$toString": "$$id" }] }
                              ] }
                           ]
                        }
                     }
                  },
                  { $project: { adminId: 0 } }
               ],
               as: "caseDocs"
            }
         },
         {
            $lookup: {
               from: "casestatuses",
               let: { id: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $or: [
                                 { $eq: ["$caseId", "$$id"] }, 
                                 { $eq: ["$caseMargeId", { "$toString": "$$id" }] }
                              ] }
                           ]
                        }
                     }
                  },
                  { $project: { adminId: 0 } }
               ],
               as: "processSteps"
            }
         },
         {
            $lookup: {
               from: "casecomments",
               let: { id: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $or: [
                                 { $eq: ["$caseId", "$$id"] }, 
                                 { $eq: ["$caseMargeId", { "$toString": "$$id" }] }
                              ] }
                           ]
                        }
                     }
                  }
               ],
               as: "caseCommit"
            }
         },
         {
            $lookup: {
               from: "casepaymentdetails",
               localField: "_id",
               foreignField: "caseId",
               pipeline: [{ $match: { isActive: true } }],
               as: "casePayment"
            }
         },
         {
            $lookup: {
               from: "casegrostatuses",
               let: { id: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $eq: ["$caseId", "$$id"] }
                           ]
                        }
                     }
                  },
                  {
                     $lookup: {
                        from: "casepaymentdetails",
                        localField: "paymentDetailsId",
                        foreignField: "_id",
                        as: "paymentDetailsId"
                     }
                  },
                  { $unwind: { path: "$paymentDetailsId", preserveNullAndEmptyArrays: true } }
               ],
               as: "caseGroDetails"
            }
         },
         { $unwind: { path: "$caseGroDetails", preserveNullAndEmptyArrays: true } },

         {
            $lookup: {
               from: "caseombudsmanstatuses",
               let: { id: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $eq: ["$caseId", "$$id"] }
                           ]
                        }
                     }
                  },
                  {
                     $lookup: {
                        from: "casepaymentdetails",
                        localField: "paymentDetailsId",
                        foreignField: "_id",
                        as: "paymentDetailsId"
                     }
                  },
                  { $unwind: { path: "$paymentDetailsId", preserveNullAndEmptyArrays: true } }
               ],
               as: "caseOmbudsmanDetails"
            }
         },
         { $unwind: { path: "$caseOmbudsmanDetails", preserveNullAndEmptyArrays: true } },
      ]);

      if (!caseData.length) {
         return res.status(404).json({ success: false, message: "Case not found" });
      }

      const result = caseData[0];

      // Filter private fields based on employee type
      const filterPrivate = (arr) =>
         arr?.filter((ele) => isOperation || ele?.isPrivate) || [];

      if (result.caseGroDetails) {
         result.caseGroDetails = {
            ...result.caseGroDetails,
            groStatusUpdates: filterPrivate(result.caseGroDetails?.groStatusUpdates),
            queryHandling: filterPrivate(result.caseGroDetails?.queryHandling),
            queryReply: filterPrivate(result.caseGroDetails?.queryReply),
            approvalLetter: result.caseGroDetails?.approvalLetterPrivate
               ? isOperation && result.caseGroDetails?.approvalLetter
               : result.caseGroDetails?.approvalLetter
         };
      }

      if (result.caseOmbudsmanDetails) {
         result.caseOmbudsmanDetails = {
            ...result.caseOmbudsmanDetails,
            statusUpdates: filterPrivate(result.caseOmbudsmanDetails?.statusUpdates),
            queryHandling: filterPrivate(result.caseOmbudsmanDetails?.queryHandling),
            queryReply: filterPrivate(result.caseOmbudsmanDetails?.queryReply),
            hearingSchedule: filterPrivate(result.caseOmbudsmanDetails?.hearingSchedule),
            awardPart: filterPrivate(result.caseOmbudsmanDetails?.awardPart),
            approvalLetter: result.caseOmbudsmanDetails?.approvalLetterPrivate
               ? isOperation && result.caseOmbudsmanDetails?.approvalLetter
               : result.caseOmbudsmanDetails?.approvalLetter
         };
      }

      return res.status(200).json({ success: true, message: "get case data", data: result });

   } catch (error) {
      console.error("employeeViewCaseByIdBy error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error });
   }
};


export const empAddCaseFile = async (req, res) => {
  try {
   await dbFunction.commonAddCaseFile(req,res)
  } catch (error) {
    console.log("add case file in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const employeeFindCaseByFileNo = async (req, res) => {
   try {
      const { employee } = req

      const { fileNo } = req.query;
      const pipeline = [
         {
            '$match': {
               fileNo: fileNo || ""
            }
         },
         {
            '$project': {
               'clientObjId': 1,
               'partnerObjId': 1,
               'empObjId': 1,
               'name': 1,
               'email':1,
               'mobileNo':1,
               'address':1,
               'pinCode':1,
               'city':1,
               'state':1,
               'fileNo': 1,
               'policyNo': 1,
               'claimAmount': 1,
               'insuranceCompanyName': 1,
            }
         },
         {
            '$lookup': {
               'from': 'partners',
               "localField": "partnerObjId",
               "foreignField": "_id",
               "as": "partnerDetails",
               'pipeline': [
                  {
                     '$project': {
                        'fullName': 1, // Include only the fullName field,
                        'email': 1
                     }
                  }
               ],
            }
         },
         {
            '$unwind': {
               'path': '$partnerDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
           {
            '$lookup': {
               'from': 'employees',
               "localField": "empObjId",
               "foreignField": "_id",
               "as": "employeeDetails",
               'pipeline': [
                  {
                     '$project': {
                        'fullName': 1, // Include only the fullName field,
                        'email': 1,
                        'designation': 1,
                        'type': 1,
                     }
                  }
               ],
            }
         },
         {
            '$unwind': {
               'path': '$employeeDetails',
               'preserveNullAndEmptyArrays': true
            }
         },

         { '$sort': { 'createdAt': -1 } },
      ];

      const result = await Case.aggregate(pipeline);

      return res.status(200).json({ success: true, message: "get case data", data: result });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

// old version
// export const empAddReferenceCaseAndMarge = async (req, res) => {
//    try {
//       const { employee } = req
//       const { partnerId, partnerCaseId, empSaleId, empSaleCaseId, clientCaseId } = req?.query
//       if (!validMongooseId(clientCaseId)) return res.status(400).json({ success: false, message: "Not a valid clientCaseId" })

//       if (!partnerId && !empSaleId) return res.status(400).json({ success: false, message: "For add case refernce must provide partnerId or employeeId" })
//       if (partnerId) {
//          if (!partnerId || !partnerCaseId) return res.status(400).json({ success: false, message: "For add partner reference partnerId,partnerCaseId are required" })
//          if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
//          if (!validMongooseId(partnerCaseId)) return res.status(400).json({ success: false, message: "Not a valid partnerCaseId" })

//          const getPartner = await Partner.findById(partnerId)
//          if (!getPartner) return res.status(404).json({ success: false, message: "Partner Not found" })

//          const getPartnerCase = await Case.findById(partnerCaseId)
//          if (!getPartnerCase) return res.status(404).json({ success: false, message: "Partner case Not found" })


//          const getClientCase = await Case.findById(clientCaseId)
//          if (getPartnerCase?.branchId?.trim()?.toLowerCase() != getClientCase?.branchId?.trim()?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

//          if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
//          console.log(getPartnerCase?.policyNo?.toLowerCase(), getClientCase?.policyNo?.toLowerCase(), getPartnerCase?.email?.toLowerCase(), getClientCase?.email?.toLowerCase());

//          if (getPartnerCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getPartnerCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
//             return res.status(404).json({ success: false, message: "Partner and client must have same policyNo and emailId" })
//          }

//          if (getClientCase?.partnerReferenceCaseDetails?._id) {
//             return res.status(404).json({ success: false, message: "Case already have the partner case reference" })
//          }

//          let mergeParmeter = {
//             partnerId: getPartner?._id?.toString(),
//             partnerName: getPartner?.profile?.consultantName,
//             partnerCode: getPartner?.profile?.consultantCode,
//             partnerReferenceCaseDetails: {
//                referenceId: getPartnerCase?._id?.toString(),
//                name: getPartner?.profile?.consultantName,
//                consultantCode: getPartner?.profile?.consultantCode,
//                referenceDate: new Date(),
//                by: employee?.fullName
//             },
//          }

//          if (getPartnerCase?.empSaleId && getPartnerCase?.empSaleName) {
//             mergeParmeter["empSaleId"] = getPartnerCase?.empSaleId
//             mergeParmeter["empSaleName"] = getPartnerCase?.empSaleName
//          }

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   ...mergeParmeter
//                }
//             }, { new: true })
//          await Case.findByIdAndUpdate(getPartnerCase?._id, { $set: { isPartnerReferenceCase: true, } })
//          const doc = await CaseDoc.updateMany({ caseId: partnerCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
//          const status = await CaseStatus.updateMany({ caseId: partnerCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
//          const comment = await CaseComment.updateMany({ caseId: partnerCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
//          return res.status(200).json({ success: true, message: "Successfully add partner case reference ", });
//       }
//       if (empSaleId) {
//          if (!empSaleId || !empSaleCaseId) return res.status(400).json({ success: false, message: "For add sale reference empSaleId,empSaleCaseId are required" })
//          if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid empSaleId" })
//          if (!validMongooseId(empSaleCaseId)) return res.status(400).json({ success: false, message: "Not a valid empSaleCaseId" })

//          const getEmployee = await Employee.findById(empSaleId)
//          if (!getEmployee) return res.status(404).json({ success: false, message: "Employee Not found" })

//          const getEmployeeCase = await Case.findById(empSaleCaseId)
//          if (!getEmployeeCase) return res.status(404).json({ success: false, message: "Employee case Not found" })


//          const getClientCase = await Case.findById(clientCaseId)
//          if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })

//          if (getEmployeeCase?.branchId?.trim()?.toLowerCase() != getClientCase?.branchId?.trim()?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

//          if (getEmployeeCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getEmployeeCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
//             return res.status(404).json({ success: false, message: "sale-employee and client must have same policyNo and emailId" })
//          }

//          // console.log("case---", getEmployeeCase?.policyNo, getClientCase?.policyNo, getEmployeeCase?.email, getClientCase?.email);
//          let empMergeParmeter = {
//             empSaleId: getEmployee?._id?.toString(),
//             empSaleName: `${getEmployee?.fullName} | ${getEmployee?.type} | ${getEmployee?.designation}`,
//             empId: getEmployee?.empId,
//             // partnerId: getEmployeeCase?.partnerId || "",
//             // partnerName: getEmployeeCase?.partnerName || "",
//             // partnerCode:getEmployeeCase?.partnerCode || "",
//             empSaleReferenceCaseDetails: {
//                referenceId: getEmployeeCase?._id?.toString(),
//                name: getEmployee?.fullName,
//                empId: getEmployee?.empId,
//                referenceDate: new Date(),
//                by: employee?.fullName
//             },
//          }

//          if (getEmployeeCase?.partnerId && getEmployeeCase?.partnerName) {
//             empMergeParmeter["partnerId"] = getEmployeeCase?.partnerId
//             empMergeParmeter["partnerName"] = getEmployeeCase?.partnerName
//             empMergeParmeter["partnerCode"] = getEmployeeCase?.partnerCode || ""
//          }

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   ...empMergeParmeter
//                }
//             }, { new: true })
//          await Case.findByIdAndUpdate(getEmployeeCase?._id, { $set: { isEmpSaleReferenceCase: true, } })
//          await CaseDoc.updateMany({ caseId: empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
//          await CaseStatus.updateMany({ caseId: empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
//          await CaseComment.updateMany({ caseId: empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
//          return res.status(200).json({ success: true, message: "Successfully add case reference ", });
//       }

//       return res.status(400).json({ success: true, message: "Failded to add case reference" });
//    } catch (error) {
//       console.log("adminAddRefenceCaseAndMarge in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }
// new version
export const empAddReferenceCaseAndMarge = async (req, res) => {
   try {
      const { employee } = req
      const { partnerId, partnerCaseId, empSaleId, empSaleCaseId, clientCaseId } = req?.query

      if(employee?.type?.toLowerCase()!="operation") return res.status(400).json({ success: false, message: "Permission denied!" })
      if (!validMongooseId(clientCaseId)) return res.status(400).json({ success: false, message: "Not a valid clientCaseId" })

      if (!partnerId && !empSaleId) return res.status(400).json({ success: false, message: "For add case refernce must provide partnerId or employeeId" })
      if (!validMongooseId(partnerId) && !validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid partnerId/ empSaleId" })
      if (!validMongooseId(partnerCaseId) && !validMongooseId(empSaleCaseId)) return res.status(400).json({ success: false, message: "Not a valid merge caseId" })

      let Model
      if (partnerId) Model = Partner
      if (empSaleId) Model = Employee
      const findModel = await Model.findById(partnerId || empSaleId)
      if (!findModel) return res.status(404).json({ success: false, message: `${partnerId ? "Partner" : "Employee"} Not found` })

      const isExistMergeTo = await Case.findById(partnerCaseId || empSaleCaseId).select("policyNo branchId empObjId partnerObjId email")
      if (!isExistMergeTo) return res.status(404).json({ success: false, message: "Partner case Not found" })


      const getClientCase = await Case.findById(clientCaseId).select("policyNo branchId empObjId partnerObjId clientObjId email")
      if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })

      if (isExistMergeTo?.branchId?.trim()?.toLowerCase() != getClientCase?.branchId?.trim()?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

      if (isExistMergeTo?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || isExistMergeTo?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
         return res.status(404).json({ success: false, message: "Both case must have same policyNo and emailId" })
      }

      if ((partnerId && getClientCase?.isPartnerReferenceCase) || (empSaleId && getClientCase?.isEmpSaleReferenceCase)) {
         return res.status(404).json({ success: false, message: `Case already have the ${partnerId ? "partner" : "employee"} case reference` })
      }

      let mergeParmeter = {}
      let bulkOps = []

      if(isExistMergeTo?.partnerObjId){
         mergeParmeter["partnerObjId"] = isExistMergeTo?.partnerObjId
         bulkOps.push({
            insertOne:{
               document:{
                  mergeCaseId:isExistMergeTo?._id,
                  caseId:getClientCase?._id,
                  partnerId:isExistMergeTo?.partnerObjId,
                  byEmpId:employee?._id
               }
            }
         })
      }

      if (isExistMergeTo?.empObjId) {
         mergeParmeter["empObjId"] = isExistMergeTo?.empObjId
            bulkOps.push({
            insertOne:{
               document:{
                  mergeCaseId:isExistMergeTo?._id,
                  caseId:getClientCase?._id,
                  empId:isExistMergeTo?.empObjId,
                  byEmpId:employee?._id
               }
            }
         })
      }

      await Promise.all([
         CaseMergeDetails.bulkWrite(bulkOps),
         Case.findByIdAndUpdate(getClientCase?._id, { $set: { ...mergeParmeter } }, { new: true }),
         Case.findByIdAndUpdate(isExistMergeTo?._id, { $set: partnerId ? { isPartnerReferenceCase: true, } : { isEmpSaleReferenceCase: true } }),
         CaseDoc.updateMany({ caseId: partnerCaseId || empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true }),
         CaseStatus.updateMany({ caseId: partnerCaseId || empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true }),
         CaseComment.updateMany({ caseId: partnerCaseId || empSaleCaseId }, { $set: { caseMargeId: clientCaseId, isMarge: true } }, { new: true })
      ])
      return res.status(200).json({ success: true, message: "Successfully add case reference ", });

   } catch (error) {
      console.log("adminAddRefenceCaseAndMarge in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

// old version
// export const empRemoveReferenceCase = async (req, res) => {
//    try {
//       const { employee } = req

//       const { type, _id } = req?.query

//       if (!type) return res.status(400).json({ success: false, message: "Please select the type of reference to remove" })
//       if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid CaseId" })

//       if (type?.toLowerCase() == "partner") {
//          const getClientCase = await Case.findById(_id)
//          if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
//          if (!validMongooseId(getClientCase?.partnerReferenceCaseDetails?.referenceId) && !validMongooseId(getClientCase?.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partner CaseId" })

//          // if partner referance add in sale emp case
//          if (getClientCase?.partnerReferenceCaseDetails?.referenceId) {
//             const updatedPartnerCase = await Case.findByIdAndUpdate(getClientCase?.partnerReferenceCaseDetails?.referenceId, { $set: { isPartnerReferenceCase: false, } }, { new: true })
//             if (!updatedPartnerCase) return res.status(404).json({ success: false, message: "Partner case is not found of the added reference case" })
//          }

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   partnerId: "",
//                   partnerName: "",
//                   partnerCode: "",
//                   empId: "",
//                   partnerReferenceCaseDetails: {},
//                }
//             }, { new: true })
//          if (getClientCase?.partnerReferenceCaseDetails?.referenceId && !getClientCase?.empSaleId) {
//             await CaseDoc.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } })
//             await CaseStatus.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } })
//             await CaseComment.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } })
//          }

//          return res.status(200).json({ success: true, message: "Successfully remove partner reference case" })
//       }
//       if (type?.toLowerCase() == "sale-emp") {
//          const getClientCase = await Case.findById(_id)
//          if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
//          if (!validMongooseId(getClientCase?.empSaleReferenceCaseDetails?.referenceId)) return res.status(400).json({ success: false, message: "Not a valid employee CaseId" })

//          const updatedPartnerCase = await Case.findByIdAndUpdate(getClientCase?.empSaleReferenceCaseDetails?.referenceId, { $set: { isEmpSaleReferenceCase: false, } }, { new: true })
//          if (!updatedPartnerCase) return res.status(404).json({ success: false, message: "Employee  case is not found of the added reference case" })

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   empSaleId: "",
//                   empSaleName: "",
//                   empSaleReferenceCaseDetails: {},
//                }
//             }, { new: true })
//          await CaseDoc.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } })
//          await CaseStatus.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } })
//          await CaseComment.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } })

//          return res.status(200).json({ success: true, message: "Successfully remove employee reference case" })
//       }

//       return res.status(400).json({ success: false, message: "Not a valid type" })
//    } catch (error) {
//       console.log("adminRemoveRefenceCase in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }

export const empRemoveReferenceCase = async (req, res) => {
   try {
      const { employee } = req

      if(employee?.type?.toLowerCase()!="operation") return res.status(400).json({ success: false, message: "Permission denied!" })

      const { type, _id } = req?.query
      if (!type) return res.status(400).json({ success: false, message: "Please select the type of reference to remove" })
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid CaseId" })

         const getClientCase = await Case.findById(_id)
         if (!getClientCase) return res.status(404).json({ success: false, message: "Case not found" })
         
         let filterOptions = {isActive:true}
         let updateMergeParameter = type?.toLowerCase() == "partner" ? { isPartnerReferenceCase: false, } : {isEmpSaleReferenceCase:false}
         let updateClientCaseParameter = type?.toLowerCase() == "partner" ? { partnerObjId: ""} : {empObjId:""}
         if(type?.toLowerCase() == "partner"){
            filterOptions.partnerId = getClientCase?.partnerObjId
         }else if(type?.toLowerCase() == "sale-emp"){
            filterOptions.empId = getClientCase?.empObjId
         }else {
            return res.status(400).json({ success: false, message: "Not a valid type" })
         }

         filterOptions.caseId = getClientCase?._id
         const mergeCase = await CaseMergeDetails.findOne(filterOptions).select("mergeCaseId")
         if(!mergeCase) return res.status(404).json({ success: false, message: "Merge case not found" })

         await Promise.all([
            Case.findByIdAndUpdate(mergeCase?.mergeCaseId, { $set: updateMergeParameter }, { new: true }), // remove ref. from merge case of partner /emp
            Case.findByIdAndUpdate(getClientCase?._id, { $unset: updateClientCaseParameter }, { new: true }), // remove partnerObjId / empObjId
            CaseMergeDetails.findByIdAndDelete(mergeCase?._id), // delete merge details
            CaseDoc.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } }),
            CaseStatus.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } }),
            CaseComment.updateMany({ caseMargeId: _id }, { $set: { caseMargeId: "", isMarge: false } }),
         ])
         return res.status(200).json({ success: true, message: "Successfully remove reference case" })
   } catch (error) {
      console.log("adminRemoveRefenceCase in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}



// old version
// export const employeeViewAllPartner = async (req, res) => {
//    try {
//       const { employee } = req
//       let empId = req?.query?.empId == "false" ? false : req?.query?.empId;
//       const pageItemLimit = req.query.limit ? req.query.limit : 10;
//       const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
//       const startDate = req.query.startDate
//       const endDate = req.query.endDate
//       const searchQuery = req.query.search ? req.query.search : "";
//       const caseAccess = ["operation", "finance", "branch"]
//       const excludedTypes = ["sales", "operation", "finance", "sathi team", "branch"];
//       let isNormalEmp = false
//       let empBranchId = false;
//       let branchWise = false
//       let findEmp = false

//       //  for specific employee case 
//       console.log("spectific emp case", empId);
//       if (empId) {
//          if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id" })
//          const getEmp = await Employee.findById(empId)
//          if (!getEmp) return res.status(400).json({ success: false, message: "Searching employee account not found" })
//          findEmp = getEmp
//          if (caseAccess?.includes(findEmp?.type?.toLowerCase())) {
//             console.log("if---");
//             empBranchId = getEmp?.branchId
//             branchWise = true
//          } else if (findEmp?.type?.toLowerCase() != "sales" && findEmp?.type?.toLowerCase() != "sathi team") {
//             console.log("else---");
//             empId = req.query?.empId
//             empBranchId = employee?.branchId
//             branchWise = true
//             isNormalEmp = true
//          }
//       }

//       // console.log("isNormal",isNormalEmp);

//       if (caseAccess?.includes(req?.user?.empType?.toLowerCase()) && !empId) {
//          empBranchId = employee?.branchId
//          branchWise = true
//          empId = false
//       } else {
//          if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "sathi team" && !empId) {
//             if (!validMongooseId(req.query?.empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id" })
//             empId = req.query?.empId
//             empBranchId = employee?.branchId
//             branchWise = true
//          }
//       }
//       if (branchWise) {
//          console.log("branchWise----");
//          const query = getAllPartnerSearchQuery(searchQuery, true, isNormalEmp && empId, startDate, endDate, !isNormalEmp && empBranchId)
//          if (!query.success) return res.status(400).json({ success: false, message: query.message })
//          const getAllPartner = await Partner.find(query.query, {
//             "branchId": 1, "salesId": 1, "isActive": 1,
//             "profile.associateWithUs": 1, "profile.consultantName": 1,
//             "profile.consultantCode": 1, "profile.primaryMobileNo": 1,
//             "profile.primaryEmail": 1, "profile.workAssociation": 1,
//             "profile.areaOfOperation": 1,
//          }).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId", "fullName type designation");
//          const noOfPartner = await Partner.count(query.query)
//          return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });

//       } else {

//          let extactMatchQuery = [
//             { referEmpId: findEmp?._id ? findEmp?._id : employee?._id },
//             { _id: findEmp?._id ? findEmp?._id : employee?._id }
//          ]

//          if ((!findEmp && employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "manager") ||
//             (findEmp && findEmp?.type?.toLowerCase() == "sales" && findEmp?.designation?.toLowerCase() == "manager")) {
//             extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
//             extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
//          }

//          // console.log("extractMatchQuery",extactMatchQuery,"----");
//          const extractType = await Employee.aggregate([
//             {
//                $match: {
//                   $or: [
//                      ...extactMatchQuery
//                   ]
//                }
//             },
//             {
//                $group: {
//                   _id: null,
//                   shareEmp: { $push: "$_id" },
//                   shareEmpId: { $push: "$_id" },
//                }
//             },
//             {
//                $project: {
//                   shareEmp: 1,
//                   shareEmpId: 1,
//                   _id: 0,
//                }
//             },
//             {
//                $project: {
//                   shareEmpId: 1,
//                   shareEmp: { $map: { input: "$shareEmp", as: "id", in: { $toString: "$$id" } } },
//                }
//             }

//          ])

//          if (startDate && endDate) {
//             const validStartDate = getValidateDate(startDate)
//             if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
//             const validEndDate = getValidateDate(endDate)
//             if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
//          }

//          let query = {
//             $and: [
//                { isActive: true },
//                { branchId: { $regex: employee?.branchId, $options: "i" } },
//                {
//                   $or: [
//                      { salesId: { $in: extractType?.[0]?.shareEmpId } },
//                      { shareEmployee: { $in: extractType?.[0]?.shareEmp } },
//                   ]
//                },
//                {
//                   $or: [
//                      { "profile.consultantName": { $regex: searchQuery, $options: "i" } },
//                      { "profile.workAssociation": { $regex: searchQuery, $options: "i" } },
//                      { "profile.consultantCode": { $regex: searchQuery, $options: "i" } },
//                      { "profile.primaryMobileNo": { $regex: searchQuery, $options: "i" } },
//                      { "profile.primaryEmail": { $regex: searchQuery, $options: "i" } },
//                      { "profile.aadhaarNo": { $regex: searchQuery, $options: "i" } },
//                      { "profile.panNo": { $regex: searchQuery, $options: "i" } },
//                      { branchId: { $regex: searchQuery, $options: "i" } },
//                   ]
//                },
//                startDate && endDate ? {
//                   createdAt: {
//                      $gte: new Date(startDate).setHours(0, 0, 0, 0),
//                      $lte: new Date(endDate).setHours(23, 59, 59, 999)
//                   }
//                } : {}
//             ]
//          };
//          const getAllPartner = await Partner.find(query, {
//             "branchId": 1, "salesId": 1, "isActive": 1,
//             "profile.associateWithUs": 1, "profile.consultantName": 1,
//             "profile.consultantCode": 1, "profile.primaryMobileNo": 1,
//             "profile.primaryEmail": 1, "profile.workAssociation": 1,
//             "profile.areaOfOperation": 1,
//          }).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId", "fullName type designation");
//          const noOfPartner = await Partner.count(query)
//          return res.status(200).json({ success: true, message: "get case data", data: getAllPartner, noOfPartner: noOfPartner });
//       }


//    } catch (error) {
//       console.log("viewAllPartnerByAdmin in error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// }

// ṇew version
export const employeeViewAllPartner = async (req, res) => {
   try {
      const { employee } = req
       const result = await getAllPartnerResult(req,employee)      
      if(result?.status==200){
         return res.status(200).json({ success: true, message: result?.message, data: result?.data, noOfPartner: result?.noOfPartner});
      }else if(result?.message){
      return res.status(result.status).json({ success: false, message:result?.message });
      } else{
      return res.status(500).json({ success: false, message: "Something went wrong" });
      }

   } catch (error) {
      console.log("employeeViewAllPartner in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeViewPartnerById = async (req, res) => {
   try {
      const { employee } = req
      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getPartner = await Partner.findById(_id).select("-password -emailOTP")
      if (!getPartner) return res.status(404).json({ success: false, message: "Partner not found" })
      return res.status(200).json({ success: true, message: "get partner by id data", data: getPartner });

   } catch (error) {
      console.log("employeeViewPartnerById in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeViewAllClient = async (req, res) => {
   try {
      const result = await getAllClientResult(req)      
      if(result?.status==1){
         return res.status(200).json({ success: true, message: "get client data", data: result?.data, noOfClient: result?.noOfClient});
      }else{
      return res.status(400).json({ success: false, message: "Something went wrong" });
      }

   } catch (error) {
      console.log("employeeViewAllClient in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const empClientDownload = async (req, res) => {
   try {
      const result = await getAllClientResult(req)      
      if(result?.status==1){
         // Generate Excel buffer
         const excelBuffer = await getAllClientDownloadExcel(result?.data);
         res.setHeader('Content-Disposition', 'attachment; filename="clients.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         return res.send(excelBuffer)
      }else{
      return res.status(400).json({ success: false, message: "Something went wrong" });
      }

   } catch (error) {
      console.log("empClientDownload in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeViewClientById = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getClient = await Client.findById(_id).select("-password -emailOTP")
      if (!getClient) return res.status(404).json({ success: false, message: "Client not found" })
      return res.status(200).json({ success: true, message: "get client by id data", data: getClient });

   } catch (error) {
      console.log("employeeViewClientById in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

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

export const employeeAddCaseComment = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })


      if (!req?.body?.Comment) return res.status(400).json({ success: false, message: "Case Comment required" })
      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })


      // const newCommit = {
      //    _id:req?.user?._id,
      //    role:req?.user?.role,
      //    name:req?.user?.fullName,
      //    type:req?.user?.empType,
      //    commit:req?.body?.Comment,Date:new Date()}      
      const getCase = await Case.findById(req.body._id)
      if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

      const newComment = new CaseComment({
         role: req?.user?.role,
         name: req?.user?.fullName,
         type: req?.user?.empType,
         message: req?.body?.Comment,
         caseId: getCase?._id?.toString(),
         employeeId: req?.user?._id,
      })
      await newComment.save()

      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${getCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${getCase?._id?.toString()}`

      sendNotificationAndMail(
         getCase?._id?.toString(),
         `New comment added on Case file No. ${getCase?.fileNo}`,
         employee?.branchId,
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )

      return res.status(200).json({ success: true, message: "Successfully add case comment" });
   } catch (error) {
      console.log("employeeAddCaseCommit in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const empAddOrUpdatePayment = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const { _id, paymentMode, caseId } = req.body

      if (!caseId) return res.status(400).json({ success: false, message: "CaseId is required" })

      const findCase = await Case.findOne({ _id: caseId, isActive: true })
      if (!findCase) return res.status(400).json({ success: false, message: "Case is not found" })

      let isExist
      if (_id) {
         isExist = await CasePaymentDetails.findById(_id)
         if (!isExist) return res.status(400).json({ success: false, message: "Payment details is not found" })
      } else {
         isExist = new CasePaymentDetails({
            caseId
         })
      }

      const updateKey = [
         "dateOfPayment", "utrNumber", "bankName", "chequeNumber",
         "chequeDate", "amount", "transactionDate", "paymentMode"
      ]

      updateKey.forEach(ele => {
         if (req.body[ele]) {
            isExist[ele] = req.body[ele]
         }
      })

      await isExist.save()
      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${caseId}`
      const notificationAdminUrl = `/admin/view case/${caseId}`

      sendNotificationAndMail(
         caseId,
         `Payment details update on  Case file No.  ${findCase?.fileNo}`,
         employee?.branchId,
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )
      return res.status(200).json({ success: true, message: "Success" });
   } catch (error) {
      console.log("employeeAddCaseCommit in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const employeeCreateInvoice = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "finance") return res.status(400).json({ success: false, message: "Access Denied" })

      const { clientId, caseId } = req.query
      // console.log(clientId, caseId);

      let getClient = false
      let getCase = false
      let billRef = {}

      const { error } = validateInvoice(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (caseId && clientId) {
         if (!validMongooseId(clientId) || !validMongooseId(caseId)) return res.status(400).json({ success: false, message: "caseId and clientId must be valid" })
         getClient = await Client.findById(clientId)
         if (!getClient) return res.status(400).json({ success: false, message: "Client not found" })
         getCase = await Case.findById(caseId)
         if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

         billRef = { caseId, clientId, }
      } else {
         billRef = { isOffice: true, paidBy: 'Office' }
      }


      const billCount = await Bill.find({}).count()
      let payload = {
         ...req.body,
         ...billRef,
         branchId: employee?.branchId,
         invoiceNo: `ACS-${billCount + 1}`
      }


      const newInvoice = new Bill({ ...payload })
      await newInvoice.save()
      return res.status(200).json({ success: true, message: "Successfully create invoice", _id: newInvoice?._id });
   } catch (error) {
      console.log("employee-create invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeViewAllInvoice = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "finance" && employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type

      // console.log(employee, "branch");
      const query = getAllInvoiceQuery(searchQuery, startDate, endDate, false, type, employee?.branchId)
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

      const getAllBill = await Bill.find(query?.query, {
         invoiceNo: 1, caseId: 1, clientId: 1, isPaid: 1, remark: 1, paidBy: 1, "receiver.name": 1, isOffice: 1,
         "receiver.email": 1, "receiver.mobileNo": 1, "receiver.state": 1, paidDate: 1, branchId: 1,
         totalAmt: 1, createdAt: 1, isActive: 1
      }).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("transactionId", "-info");
      const noOfBill = await Bill.count(query?.query)
      const aggregateResult = await Bill.aggregate(aggregationPipeline);
      return res.status(200).json({ success: true, message: "get case data", data: getAllBill, noOf: noOfBill, totalAmt: aggregateResult });

   } catch (error) {
      console.log("employee-get invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}
export const empDownloadAllInvoice = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "finance" && employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type

      const query = getAllInvoiceQuery(searchQuery, startDate, endDate, false, type, employee?.branchId)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })

      const getAllBill = await Bill.find(query?.query).populate("transactionId", "paymentMode");
      // console.log("getAllBill",getAllBill);

      const excelBuffer = await commonInvoiceDownloadExcel(getAllBill)
      // console.log("excelBuffer",excelBuffer);

      res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)
   } catch (error) {
      console.log("employee-get invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeViewInvoiceById = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "finance" && employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getInvoice = await Bill.findById(_id)
      if (!getInvoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      return res.status(200).json({ success: true, message: "get invoice by id data", data: getInvoice });

   } catch (error) {
      console.log("employeeViewPartnerById in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeDownloadInvoiceById = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "finance") return res.status(400).json({ success: false, message: "Access Denied" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getInvoice = await Bill.findById(_id)
      if (!getInvoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      const pdfResult = await invoiceHtmlToPdfBuffer('./views/invoice.ejs', getInvoice)
      res.setHeader('Content-Disposition', 'attachment;filename="invoice.pdf"')
      res.setHeader('Content-Type', 'application/pdf');
      res.status(200)
      res.send(pdfResult)

      //  return res.status(200).json({success:true,message:"download invoice by id data",data:pdfResult});

   } catch (error) {
      console.log("employeeDownloadInvoiceById in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const employeeEditInvoice = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "finance" && employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { error } = validateInvoice(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const getInvoice = await Bill.findById(_id)
      if (!getInvoice?.isPaid) {
         const invoice = await Bill.findByIdAndUpdate(_id, { $set: req?.body })
         return res.status(200).json({ success: true, message: "Successfully update invoice" });
      } else {
         return res.status(400).json({ success: true, message: "Paid invoice not be editable" });
      }
   } catch (error) {
      console.log("employee-create invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeEditInvoiceNo = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "finance" && employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id, invoiceNo } = req.body;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const isExist = await Bill.findById(_id)
      if (!isExist) return res.status(400).json({ success: true, message: "Invoice not found" });
      isExist.invoiceNo = invoiceNo
      await isExist.save()

      return res.status(200).json({ success: true, message: "Successfully update invoice no" });
   } catch (error) {
      console.log("invoice no in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeUnActiveInvoice = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "finance" && employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id, type } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const invoice = await Bill.findByIdAndUpdate(_id, { $set: { isActive: type } })

      return res.status(200).json({ success: true, message: `Successfully ${type == "true" ? "restore" : "remove"} invoice` });
   } catch (error) {
      console.log("employee-remove invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const employeeRemoveInvoice = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "finance") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id, type } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const invoice = await Bill.findByIdAndDelete(_id)

      return res.status(200).json({ success: true, message: `Successfully delete invoice` });
   } catch (error) {
      console.log("admin-delete invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


// old version
// export const allEmployeeDashboard = async (req, res) => {
//    try {
//       const { employee } = req
//       const year = Number(req.query.year || new Date().getFullYear())
//       let filter = {}
//       let extractType = []
//       const caseAccess = ["operation", "finance", "branch"]
//       const excludedTypes = ["sales", "operation", "finance", "sathi team", "branch"];
//       let currentYear = new Date().getFullYear()
//       const currentYearStart = new Date(new Date(new Date().setFullYear(year ||  currentYear)).getFullYear(), 0, 1); // Start of the current year
//       const currentMonth = year==currentYear ?  new Date().getMonth() + 1 : 12;
//       const allMonths = [];
//       for (let i = 0; i < currentMonth; i++) {
//          allMonths.push({
//             _id: {
//                year: year || new Date().getFullYear(),
//                month: i + 1
//             },
//             totalCases: 0
//          });
//       }


//       if (caseAccess?.includes(employee?.type?.toLowerCase())) {
//          filter = {
//             createdAt: { $gte: currentYearStart },
//             isActive: true,
//             branchId: { $regex: employee?.branchId, $options: "i" },
//             isPartnerReferenceCase: false,
//             isEmpSaleReferenceCase: false
//          }
//       } else {
//          let extactMatchQuery = [
//             { referEmpId: employee?._id },
//             { _id: employee?._id }
//          ]

//          if (employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "manager") {
//             extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
//             extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
//          }
//          extractType = await Employee.aggregate([
//             {
//                $match: {
//                   $or: [
//                      ...extactMatchQuery
//                   ]
//                }
//             },
//             {
//                "$group": {
//                   "_id": null,
//                   "shareEmpStr": { "$push": { "$toString": "$_id" } },
//                   "shareEmpObj": { "$push": "$_id" }
//                }
//             },
//             {
//                "$lookup": {
//                   from: "partners",
//                   let: { shareEmpStr: "$shareEmpStr", shareEmpObj: "$shareEmpObj" },
//                   pipeline: [
//                      {
//                         $match: {
//                            $expr: {
//                               $or: [
//                                  { $in: ["$salesId", "$$shareEmpObj"] }, // Use ObjectId array for salesId
//                                  {
//                                     $gt: [
//                                        {
//                                           $size: {
//                                              $filter: {
//                                                 input: { $ifNull: ["$shareEmployee", []] }, // Ensure shareEmployee is an array
//                                                 as: "shareEmployeeId",
//                                                 cond: { $in: ["$$shareEmployeeId", "$$shareEmpStr"] }
//                                              }
//                                           }
//                                        },
//                                        0
//                                     ]
//                                  }
//                               ]
//                            }
//                         }
//                      }
//                   ],
//                   as: "partners"
//                }
//             },
//             {
//                $lookup: {
//                   from: "clients",
//                   let: { shareEmpObj: "$shareEmpObj" },
//                   pipeline: [
//                      {
//                         $match: {
//                            $expr: {
//                               $or: [
//                                  { $in: ["$salesId", "$$shareEmpObj"] },

//                               ]
//                            }
//                         }
//                      }
//                   ],
//                   as: "allClients"
//                }
//             },
//             {
//                $project: {
//                   shareEmpObj: 1,
//                   _id: 0,
//                   allClients: {
//                      $map: {
//                         input: "$allClients",
//                         as: "allClients",
//                         in: "$$allClients._id"
//                      }
//                   },
//                   allPartners: {
//                      $map: {
//                         input: "$partners",
//                         as: "partner",
//                         in: "$$partner._id"
//                      }
//                   }
//                }
//             },
//             {
//                $project: {
//                   shareEmp: { $map: { input: "$shareEmpObj", as: "id", in: { $toString: "$$id" } } },
//                   allPartners: { $map: { input: "$allPartners", as: "id", in: { $toString: "$$id" } } },
//                   allClients: { $map: { input: "$allClients", as: "id", in: { $toString: "$$id" } } }
//                }
//             }
//          ])

//          if (excludedTypes?.includes(employee?.type?.toLowerCase())) {
//             filter = {
//                $and: [
//                   { createdAt: { $gte: currentYearStart } },
//                   { isPartnerReferenceCase: false },
//                   { isEmpSaleReferenceCase: false },
//                   { isActive: true },
//                   { branchId: { $regex: employee?.branchId, $options: "i" } },
//                   {
//                      $or: [
//                         // excludedTypes?.includes(employee?.type.toLowerCase()) ? {$in:{addEmployee:[employee?._id?.toString]}} :{},
//                         { empSaleId: { $in: extractType?.[0]?.shareEmp } },
//                         { partnerId: { $in: extractType?.[0]?.allPartners } },
//                         { clientId: { $in: extractType?.[0]?.allClients } },
//                      ]
//                   },
//                ]
//             };
//          } else {
//             filter = {
//                $and: [
//                   { createdAt: { $gte: currentYearStart } },
//                   { isPartnerReferenceCase: false },
//                   { isEmpSaleReferenceCase: false },
//                   { isActive: true },
//                   { addEmployee: { $in: [employee?._id?.toString()] } },
//                   // { branchId: { $regex: employee?.branchId, $options: "i" } },
//                ]
//             }
//          }
//       }

//       const noOfPartner = await Partner.find(
//          caseAccess?.includes(employee?.type?.toLowerCase()) ?
//             { isActive: true, branchId: { $regex: employee?.branchId, $options: "i" } } :
//             {
//                $and: [{ isActive: true }, { branchId: { $regex: employee?.branchId, $options: "i" } }, {
//                   $or: [{ salesId: { $in: extractType?.[0]?.shareEmp || [] } },
//                   { shareEmployee: { $in: extractType?.[0]?.shareEmp || [] } }
//                   ]
//                }]
//             })
//          .count();

//       const pieChartData = await Case.aggregate([
//          {
//             '$match': filter
//          },
//          {
//             '$group': {
//                '_id': '$currentStatus',
//                'totalCases': {
//                   '$sum': 1
//                },
//                'totalCaseAmount': {
//                   '$sum': '$claimAmount' // Assuming 'amount' is the field to sum
//                }
//             }
//          },
//          {
//             '$group': {
//                '_id': null,
//                'totalCase': {
//                   '$sum': '$totalCases'
//                },
//                'totalCaseAmount': {
//                   '$sum': '$totalCaseAmount'
//                },
//                'allCase': {
//                   '$push': '$$ROOT'
//                }
//             }
//          }
//       ]);

//       const graphData = await Case.aggregate([
//          {
//             '$match': filter
//          },
//          {
//             $group: {
//                _id: {
//                   year: { $year: '$createdAt' },
//                   month: { $month: '$createdAt' }
//                },
//                totalCases: { $sum: 1 }
//             }
//          },
//          {
//             $sort: { '_id.year': 1, '_id.month': 1 }
//          },])

//       // Merge aggregated data with the array representing all months
//       const mergedGraphData = allMonths.map((month) => {
//          const match = graphData.find((data) => {
//             return data._id.year === month._id.year && data._id.month === month._id.month;
//          });
//          return match || month;
//       });
//       return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData, noOfPartner, employee });
//    } catch (error) {
//       console.log("get dashbaord data error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// };

// new version

export const allEmployeeDashboard = async (req, res) => {
   try {
      const { employee } = req
      let filter = {}
      let extactOptions = []
      const caseAccess = ["operation", "finance", "branch"]
      const excludedTypes = ["sales", "operation", "finance", "sathi team", "branch"];
      const year = Number(req.query.year || new Date().getFullYear());

      // Define the time range for the selected year
      const currentYear = new Date().getFullYear();
      const currentYearStart = new Date(year, 0, 1); // Jan 1 of selected year
      const endYearStart = new Date(year + 1, 0, 1); // Jan 1 of next year
      const currentMonth = year === currentYear ? new Date().getMonth() + 1 : 12;

      // Generate default 0-case values for each month
      const allMonths = [];
      for (let i = 0; i < currentMonth; i++) {
         allMonths.push({
            _id: {
               year: year,
               month: i + 1
            },
            totalCases: 0
         });
      }

      if (caseAccess?.includes(employee?.type?.toLowerCase())) {
         filter = {
            createdAt: {
               $gte: currentYearStart,
               $lt: endYearStart,
            },
            isActive: true,
            branchId: { $regex: employee?.branchId, $options: "i" },
            isPartnerReferenceCase: false,
            isEmpSaleReferenceCase: false
         }
      } else {
         let extactMatchQuery = [
            { referEmpId: employee?._id },
            { _id: employee?._id }
         ]

         if (employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "manager") {
            extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
            extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
         }
         // extract filter options 
         const filterPipeline = [
            {
               "$match": {
                  "$or": [
                     ...extactMatchQuery
                  ]
               }
            },
            {
               "$project": {
                  "referEmpId": 1,
                  "_id": 1,
               },
            },
            {
               "$lookup": {
                  "from": "sharesections",
                  "localField": "_id",
                  "foreignField": "toEmployeeId",
                  "as": "shareSection",
                  "pipeline": [
                     {
                        "$project": {
                           "_id": 1,
                           "partnerId": 1,
                           "caseId": 1,
                           "clientId": 1,
                        },
                     },
                  ],
               },
            },
            {
               "$unwind": {
                  "path": "$shareSection",
                  "preserveNullAndEmptyArrays": true,
               },
            },
            {
               "$lookup": {
                  "from": "partners",
                  "localField": "_id",
                  "foreignField": "salesId",
                  "as": "referPartner",
                  "pipeline": [
                     {
                        "$project": {
                           "_id": 1,
                        },
                     },
                  ],
               }
            },
            {
               "$unwind": {
                  "path": "$referPartner",
                  "preserveNullAndEmptyArrays": true
               }
            },
            {
               "$group": {
                  "_id": null,
                  "empIds": {
                     "$addToSet": "$_id",
                  },
                  "referPartnerIds": { "$addToSet": "$referPartner._id" },
                  "partnerIds": {
                     "$addToSet": "$shareSection.partnerId",
                  },
                  "clientIds": {
                     "$addToSet": "$shareSection.clientId",
                  },
                  "caseIds": {
                     "$addToSet": "$shareSection.caseId",
                  },
               },
            },
            {
               "$addFields": {
                  "allPartnerIds": {
                     "$setUnion": [
                        "$partnerIds",
                        "$referPartnerIds",
                     ],
                  },
               },
            },
         ]

         extactOptions = await Employee.aggregate(filterPipeline)

         if (excludedTypes?.includes(employee?.type?.toLowerCase())) {
            filter = {
               $and: [
                  {
                     createdAt: {
                        $gte: currentYearStart,
                        $lt: endYearStart,
                     }
                  },
                  { isPartnerReferenceCase: false },
                  { isEmpSaleReferenceCase: false },
                  { isActive: true },
                  { branchId: { $regex: employee?.branchId, $options: "i" } },
                  {
                     $or: [
                        { empObjId: { $in: extactOptions?.[0]?.empIds } },
                        { partnerObjId: { $in: extactOptions?.[0]?.allPartnerIds } },
                        { clientObjId: { $in: extactOptions?.[0]?.clientIds } },
                     ]
                  },
               ]
            };
         } else {
            filter = {
               $and: [
                  {
                     createdAt: {
                        $gte: currentYearStart,
                        $lt: endYearStart,
                     }
                  },
                  { isPartnerReferenceCase: false },
                  { isEmpSaleReferenceCase: false },
                  { isActive: true },
                  { empObjId: { $in: extactOptions?.[0]?.empIds } },
                  // { branchId: { $regex: employee?.branchId, $options: "i" } },
               ]
            }
         }
      }

      const noOfPartner = await Partner.find(
         caseAccess?.includes(employee?.type?.toLowerCase()) ?
            { isActive: true, branchId: { $regex: employee?.branchId, $options: "i" } } :
            {
               $and: [{ isActive: true }, { branchId: { $regex: employee?.branchId, $options: "i" } }, {
                  $or: [{ empObjId: { $in: extactOptions?.[0]?.empIds || [] } },
                  { _id: { $in: extactOptions?.[0]?.allPartnerIds || [] } }
                  ]
               }]
            })
         .count();

      // Get case distribution by currentStatus (for pie chart)
      const pieChartData = await Case.aggregate([
         {
            $match: filter
         },
         {
            $group: {
               _id: '$currentStatus',
               totalCases: { $sum: 1 },
               totalCaseAmount: { $sum: '$claimAmount' }
            }
         },
         {
            $group: {
               _id: null,
               totalCase: { $sum: '$totalCases' },
               totalCaseAmount: { $sum: '$totalCaseAmount' },
               allCase: { $push: '$$ROOT' }
            }
         }
      ]);

      // Get case counts per month (for bar/line graph)
      const graphData = await Case.aggregate([
         {
            $match: filter
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
         }
      ]);

      // Merge aggregated monthly data with the full list of months
      const mergedGraphData = allMonths.map((month) => {
         const match = graphData.find((data) =>
            data._id.year === month._id.year && data._id.month === month._id.month
         );
         return {
            ...month,
            ...(match || {}),
            monthName: new Date(month._id.year, month._id.month - 1)
               .toLocaleString('default', { month: 'short' })
         };
      });

      return res.status(200).json({
         success: true,
         message: "get dashboard data",
         graphData: mergedGraphData,
         pieChartData,
         noOfPartner, employee
      });

   } catch (error) {
      console.error("get dashboard data error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error });
   }
};

export const saleEmployeeAddPartner = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "branch" && employee?.type?.toLowerCase() != "sathi team") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { error } = validateAddPartner(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const isPartnerExist = await Partner.find({ email: req.body.email })
      if (isPartnerExist?.length > 0 && isPartnerExist[0]?.emailVerify) {
         return res.status(400).json({ success: true, message: "Partner account already exist", });
      }

      const jwtString = await Jwt.sign({ ...req.body, empId: req?.user?._id, empBranchId: employee?.branchId?.trim()?.toLowerCase() }, process.env.EMPLOYEE_SECRET_KEY, { expiresIn: '24h' })

      const requestLink = `/partner/accept-request/${jwtString}`
      await sendAddPartnerRequest(req.body.email, requestLink)
      // console.log(requestLink, "requestLink----");
      return res.status(200).json({ success: true, message: "Successfully send add partner request" });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const saleEmployeeAddCase = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "branch") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { error } = validateAddEmpCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      let newClient = false
      let clientDetails = {}

      const { partnerEmail, partnerCode } = req.body
      if (partnerEmail || partnerCode) {
         if (!partnerEmail) return res.status(400).json({ success: false, message: "Partner Email is required" })
         const getPartner = await Partner.find({ email: { $regex: partnerEmail, $options: "i" } })
         if (getPartner?.length == 0) {
            return res.status(400).json({ success: false, message: "Partner not found" })
         } else {
            if (getPartner[0]?.profile?.consultantCode != partnerCode) return res.status(400).json({ success: false, message: "Incorrect email/ consultantCode" })
            req.body.partnerId = getPartner[0]?._id
            req.body.partnerObjId = getPartner[0]?._id
            req.body.partnerName = getPartner[0]?.profile?.consultantName
         }
      }

      if (req.body.clientEmail) {
         if (!req.body.clientName || !req.body.clientMobileNo) return res.status(400).json({ success: false, message: "Client name and mobileNo are required" });
         const isClientExist = await Client.find({ email: { $regex: req.body.clientEmail, $options: "i" } })
         if (!(isClientExist?.length > 0 && isClientExist[0]?.emailVerify)) {
            newClient = true
            clientDetails = {
               clientName: req.body.clientName?.trim(),
               clientEmail: req.body.clientEmail?.trim(),
               clientMobileNo: req.body.clientMobileNo,
               empId: req?.user?._id,
               empBranchId: employee?.branchId?.trim()?.toLowerCase()
            }
         } else {
            return res.status(400).json({ success: false, message: "Client account already exist" })
         }
      }

      req.body.empSaleId = employee?._id,
      req.body.empObjId = employee?._id,
      req.body.empSaleName = `${employee?.fullName} | ${employee?.type?.toLowerCase()} | ${employee?.designation?.toLowerCase()}`,
      req.body.caseFrom = "team"

      const newAddCase = new Case({ ...req.body, branchId: employee?.branchId?.toLowerCase(), caseDocs: [] })
      const noOfCase = await Case.count()
      newAddCase.fileNo = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfCase + 1}`
      await newAddCase.save()

      const defaultStatus = new CaseStatus({
         caseId: newAddCase?._id?.toString()
      })
      await defaultStatus.save()
      //  add case doc
      let bulkOps = [];
      (req?.body?.caseDocs || [])?.forEach((doc) => {
         bulkOps.push({
            insertOne: {
               document: {
                  name: doc?.docName,
                  type: doc?.docType,
                  format: doc?.docFormat,
                  url: doc?.docURL,
                  employeeId: req?.user?._id,
                  caseId: newAddCase?._id?.toString(),
               }
            }
         });
      });
      bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

      const addNotification = new Notification({
         caseId: newAddCase?._id?.toString(),
         message: `New Case file No. ${newAddCase?.fileNo} added.`,
         branchId: employee?.branchId,
         empIds: [req?.user?._id]
      })
      await addNotification.save()

      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${newAddCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${newAddCase?._id?.toString()}`

      sendNotificationAndMail(
         newAddCase?._id?.toString(),
         `New Case file No. ${newAddCase?.fileNo} added.`,
         employee?.branchId,
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )


      if (newClient && clientDetails?.clientEmail) {
         const jwtString = await Jwt.sign({
            ...clientDetails,
            caseId: newAddCase?._id?.toString(),
         }, process.env.EMPLOYEE_SECRET_KEY, { expiresIn: '24h' })

         const requestLink = `/client/accept-request/${jwtString}`
         // console.log(requestLink,"requestLink----------");
         await sendAddClientRequest(req.body.clientEmail, requestLink)
      }

      return res.status(200).json({ success: true, message: "Successfully add case", data: newAddCase });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const saleEmpViewPartnerReport = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      // if(employee?.type?.toLowerCase()!="sales"){
      //    return res.status(400).json({success: false, message:"Access denied"})
      // }

      if (!validMongooseId(req.query.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
      const partner = await Partner.findById(req.query.partnerId).select({
         "branchId": 1, "salesId": 1, "isActive": 1,
         "profile.associateWithUs": 1, "profile.consultantName": 1,
         "profile.consultantCode": 1, "profile.primaryMobileNo": 1,
         "profile.primaryEmail": 1, "profile.workAssociation": 1,
         "profile.areaOfOperation": 1,
      })
      if (!partner) return res.status(404).json({ success: false, message: "Parnter not found" })
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      // const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req.query.partnerId, false, false, type)
      // if (!query.success) return res.status(400).json({ success: false, message: query.message })
      // const aggregationPipeline = [
      //    { $match: query?.query }, // Match the documents based on the query
      //    {
      //       $group: {
      //          _id: null,
      //          totalAmtSum: { $sum: "$claimAmount" }, // Calculate the sum of totalAmt
      //          totalResolvedAmt: {
      //             $sum: { $cond: [{ $eq: ["$currentStatus", "Resolve"] }, "$claimAmount", 0] } // Calculate the sum of claimAmount for resolved cases
      //          }
      //       }
      //    }
      // ];


      // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      // const noOfCase = await Case.find(query?.query).count()
      // const aggregateResult = await Case.aggregate(aggregationPipeline);

      const matchQuery = []


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      if (startDate && endDate) {
         const start = new Date(startDate).setHours(0, 0, 0, 0);
         const end = new Date(endDate).setHours(23, 59, 59, 999);

         matchQuery.push({
            createdAt: {
               $gte: new Date(start),
               $lte: new Date(end)
            }
         });
      }

      const pipeline = [
         {
            $match: {
               $and: [
                  { isPartnerReferenceCase: false },
                  { isEmpSaleReferenceCase: false },
                  { currentStatus: { $regex: statusType, $options: "i" } },
                  { partnerId: req.query.partnerId },
                  ...matchQuery,
               ]
            }
         },
         {
            $project: {
               clientId: 1,
               consultantCode: 1,
               branchId: 1,
               partnerId: 1,
               partnerCode: 1,
               empSaleId: 1,
               isActive: 1,
               caseFrom: 1,
               name: 1,
               mobileNo: 1,
               email: 1,
               claimAmount: 1,
               policyNo: 1,
               fileNo: 1,
               policyType: 1,
               complaintType: 1,
               createdAt: 1,
               currentStatus: 1
            }
         },
         {
            $addFields: {
               validPartnerIdString: {
                  $cond: {
                     if: {
                        $and: [
                           { $eq: [{ $type: "$partnerId" }, "string"] }, // Ensure partnerId is of type string
                           { $ne: ["$partnerId", ""] }, // Ensure partnerId is not an empty string
                           { $eq: [{ $strLenCP: "$partnerId" }, 24] } // Ensure it has exactly 24 characters
                        ]
                     },
                     then: "$partnerId",
                     else: null
                  }
               }
            }
         },
         {
            $lookup: {
               from: 'partners',
               let: { partnerIdString: "$validPartnerIdString" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $ne: ["$$partnerIdString", null] }, // Ensure partnerIdString is not null
                              { $ne: ["$$partnerIdString", ""] }, // Ensure partnerIdString is not an empty string
                              {
                                 $eq: [
                                    "$_id",
                                    { $toObjectId: "$$partnerIdString" }
                                 ]
                              }
                           ]
                        }
                     }
                  },
                  {
                     $project: {
                        fullName: 1 // Include only the fullName field
                     }
                  }
               ],
               as: 'partnerDetails'
            }
         },
         {
            '$unwind': {
               'path': '$partnerDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            $addFields: {
               validSaleEmpIdString: {
                  $cond: {
                     if: {
                        $and: [
                           { $eq: [{ $type: "$empSaleId" }, "string"] }, // Ensure partnerId is of type string
                           { $ne: ["$empSaleId", ""] }, // Ensure partnerId is not an empty string
                           { $eq: [{ $strLenCP: "$empSaleId" }, 24] } // Ensure it has exactly 24 characters
                        ]
                     },
                     then: "$empSaleId",
                     else: null
                  }
               }
            }
         },
         {
            $lookup: {
               from: 'employees',
               let: { saleEmpIdString: "$validSaleEmpIdString" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $ne: ["$$saleEmpIdString", null] }, // Ensure partnerIdString is not null
                              { $ne: ["$$saleEmpIdString", ""] }, // Ensure partnerIdString is not an empty string
                              {
                                 $eq: [
                                    "$_id",
                                    { $toObjectId: "$$saleEmpIdString" }
                                 ]
                              }
                           ]
                        }
                     }
                  },
                  {
                     $project: {
                        fullName: 1, // Include only the fullName field
                        designation: 1,
                        type: 1
                     }
                  }
               ],
               as: 'employeeDetails'
            }
         },
         {
            '$unwind': {
               'path': '$employeeDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            '$match': {
               '$or': [
                  { name: { $regex: searchQuery, $options: "i" } },
                  { 'partnerDetails.fullName': { $regex: searchQuery, $options: "i" } },
                  { 'employeeDetails.fullName': { $regex: searchQuery, $options: "i" } },
                  { consultantCode: { $regex: searchQuery, $options: "i" } },
                  { fileNo: { $regex: searchQuery, $options: "i" } },
                  { email: { $regex: searchQuery, $options: "i" } },
                  { mobileNo: { $regex: searchQuery, $options: "i" } },
                  { policyType: { $regex: searchQuery, $options: "i" } },
                  { caseFrom: { $regex: searchQuery, $options: "i" } },
                  { branchId: { $regex: searchQuery, $options: "i" } },
               ]
            }
         },
         { '$sort': { 'createdAt': -1 } },
         {
            $facet: {
               cases: [
                  { $sort: { createdAt: -1 } },
                  { $skip: Number(pageNo) },
                  { $limit: Number(pageItemLimit) },
                  {
                     $project: {
                        validPartnerIdString: 0,
                        validSaleEmpIdString: 0,
                     }
                  }
               ],
               totalCount: [
                  { $count: "count" }
               ],
               totalAmt: [
                  {
                     $group: {
                        _id: null,
                        totalAmtSum: { $sum: "$claimAmount" }, // Calculate the sum of totalAmt
                        totalResolvedAmt: {
                           $sum: { $cond: [{ $eq: ["$currentStatus", "Resolve"] }, "$claimAmount", 0] } // Calculate the sum of claimAmount for resolved cases
                        }
                     }
                  }
               ]
            }
         }
      ];

      const result = await Case.aggregate(pipeline);
      //  console.log("result",result?.[0]?.totalAmt);

      const getAllCase = result[0].cases;
      const noOfCase = result[0].totalCount[0]?.count || 0;
      const totalAmount = result?.[0]?.totalAmt

      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount, user: partner });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empDownloadPartnerReport = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      const empSaleId = req?.user?.empType?.toLowerCase() == "sales" ? req?.user?._id : false

      if (!validMongooseId(req.query.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
      const partner = await Partner.findById(req.query.partnerId).select("-password")
      if (!partner) return res.status(404).json({ success: false, message: "Parnter not found" })

      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req.query.partnerId, false, false, type)
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


export const salesDownloadCaseReport = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Account account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true
      const caseAccess = ["operation", "finance", "branch"]
      let empId = req?.query?.empId == "false" ? false : req?.query?.empId;
      let empBranchId = false;
      let branchWise = false
      let findEmp = false
      let isNormalEmp = false
      let getAllCase = []

      //  for specific employee case 
      if (empId) {
         if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id1" })
         const getEmp = await Employee.findById(empId)
         if (!getEmp) return res.status(400).json({ success: false, message: "Searching employee account not found" })
         findEmp = getEmp

         if (caseAccess?.includes(findEmp?.type?.toLowerCase())) {
            console.log("if---");
            empBranchId = getEmp?.branchId
            branchWise = true
         } else if (findEmp?.type?.toLowerCase() != "sales" && findEmp?.type?.toLowerCase() != "sathi team" && !empId) {
            console.log("else---");
            empId = req.query?.empId
            empBranchId = employee?.branchId
            branchWise = true
            isNormalEmp = true
         }
      }

      if (caseAccess?.includes(req?.user?.empType?.toLowerCase()) && !empId) {
         empBranchId = employee?.branchId
         branchWise = true
         empId = false
      } else {
         if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "sathi team" && !empId) {
            empId = employee?._id?.toString()
            empBranchId = false
            branchWise = true
         }
      }

      if (caseAccess?.includes(req?.user?.empType?.toLowerCase()) && !empId) {
         empBranchId = employee?.branchId
         branchWise = true
         empId = false
      } else {
         if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "sathi team" && !empId) {
            empId = employee?._id?.toString()
            empBranchId = false
            branchWise = true
         }
      }


      if (branchWise) {
         const andCondition = [
            { isPartnerReferenceCase: false },
            { isEmpSaleReferenceCase: false },
            { isActive: true },
         ]
         if (statusType) {
            andCondition.push(
               { currentStatus: { $regex: statusType, $options: "i" } },
            )
         }

         if (!isNormalEmp && empBranchId) {
            andCondition.push(
               { branchId: { $regex: empBranchId, $options: "i" } }
            )
         }

         if (searchQuery) {
            andCondition.push(
               {
                  $or: [
                     { name: { $regex: searchQuery, $options: "i" } },
                     { 'employeeDetails.fullName': { $regex: searchQuery, $options: "i" } },
                     { 'partnerDetails.fullName': { $regex: searchQuery, $options: "i" } },
                     { partnerName: { $regex: searchQuery, $options: "i" } },
                     { consultantCode: { $regex: searchQuery, $options: "i" } },
                     { fileNo: { $regex: searchQuery, $options: "i" } },
                     { email: { $regex: searchQuery, $options: "i" } },
                     { mobileNo: { $regex: searchQuery, $options: "i" } },
                     { policyType: { $regex: searchQuery, $options: "i" } },
                     { caseFrom: { $regex: searchQuery, $options: "i" } },
                     { branchId: { $regex: searchQuery, $options: "i" } },
                  ]
               }
            )
         }

         if (startDate && endDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            andCondition.push(
               {
                  createdAt: {
                     $gte: new Date(start),
                     $lte: new Date(end)
                  }
               }

            )
         }


         let matchQuery = {
            $and: andCondition
         };

         const pipeline = [
            {
               $lookup: {
                  from: "casepaymentdetails",       // Collection name
                  localField: "_id",             // Field in `cases` collection
                  foreignField: "caseId",           // Field in `CasePaymentDetails` collection
                  as: "paymentDetails"             // Output array field
               }
            },
            {
               $lookup: {
                  from: "casestatuses",
                  let: { caseId: "$_id" },
                  pipeline: [
                     { $match: { $expr: { $eq: ["$caseId", "$$caseId"] } } },
                     {
                        $sort: {
                           date: -1, createdAt: -1
                        }
                     }, // Sort by updatedAt descending
                     { $limit: 1 }                 // Take the latest case status
                  ],
                  as: "latestCaseStatus"
               }
            },
            {
               '$unwind': {
                  'path': '$latestCaseStatus'
               }
            },
            {
               $addFields: {
                  validPartnerIdString: {
                     $cond: {
                        if: {
                           $and: [
                              { $eq: [{ $type: "$partnerId" }, "string"] }, // Ensure partnerId is of type string
                              { $ne: ["$partnerId", ""] }, // Ensure partnerId is not an empty string
                              { $eq: [{ $strLenCP: "$partnerId" }, 24] } // Ensure it has exactly 24 characters
                           ]
                        },
                        then: "$partnerId",
                        else: null
                     }
                  }
               }
            },
            {
               $lookup: {
                  from: 'partners',
                  let: { partnerIdString: "$validPartnerIdString" },
                  pipeline: [
                     {
                        $match: {
                           $expr: {
                              $and: [
                                 { $ne: ["$$partnerIdString", null] }, // Ensure partnerIdString is not null
                                 { $ne: ["$$partnerIdString", ""] }, // Ensure partnerIdString is not an empty string
                                 {
                                    $eq: [
                                       "$_id",
                                       { $toObjectId: "$$partnerIdString" }
                                    ]
                                 }
                              ]
                           }
                        }
                     },
                     {
                        $project: {
                           fullName: 1 // Include only the fullName field
                        }
                     }
                  ],
                  as: 'partnerDetails'
               }
            },
            {
               '$unwind': {
                  'path': '$partnerDetails',
                  'preserveNullAndEmptyArrays': true
               }
            },
            {
               $addFields: {
                  validSaleEmpIdString: {
                     $cond: {
                        if: {
                           $and: [
                              { $eq: [{ $type: "$empSaleId" }, "string"] }, // Ensure partnerId is of type string
                              { $ne: ["$empSaleId", ""] }, // Ensure partnerId is not an empty string
                              { $eq: [{ $strLenCP: "$empSaleId" }, 24] } // Ensure it has exactly 24 characters
                           ]
                        },
                        then: "$empSaleId",
                        else: null
                     }
                  }
               }
            },
            {
               $lookup: {
                  from: 'employees',
                  let: { saleEmpIdString: "$validSaleEmpIdString" },
                  pipeline: [
                     {
                        $match: {
                           $expr: {
                              $and: [
                                 { $ne: ["$$saleEmpIdString", null] }, // Ensure partnerIdString is not null
                                 { $ne: ["$$saleEmpIdString", ""] }, // Ensure partnerIdString is not an empty string
                                 {
                                    $eq: [
                                       "$_id",
                                       { $toObjectId: "$$saleEmpIdString" }
                                    ]
                                 }
                              ]
                           }
                        }
                     },
                     {
                        $project: {
                           fullName: 1, // Include only the fullName field
                           designation: 1,
                           type: 1
                        }
                     }
                  ],
                  as: 'employeeDetails'
               }
            },
            {
               '$unwind': {
                  'path': '$employeeDetails',
                  'preserveNullAndEmptyArrays': true
               }
            },
            {
               '$project': {
                  caseDocs: 0,
                  processSteps: 0,
                  addEmployee: 0,
                  __v: 0,
                  validPartnerIdString: 0,
                  validSaleEmpIdString: 0
               }
            },
            {
               $match: {
                  ...matchQuery
               }
            },
            { '$sort': { 'createdAt': -1 } },
         ]

         const getAllCase = await Case.aggregate(pipeline)
         const excelBuffer = await commonDownloadCaseExcel(getAllCase)
         res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         res.send(excelBuffer)

      } else {

         //    let extactMatchQuery = [
         //       { referEmpId: findEmp?._id ? findEmp?._id :  employee?._id },
         //       { _id: findEmp?._id ? findEmp?._id :  employee?._id }
         //    ]

         //    if(!findEmp && employee?.type?.toLowerCase()=="sales" && employee?.designation?.toLowerCase()=="manager" || 
         //    (findEmp && findEmp?.type?.toLowerCase()=="sales" && findEmp?.designation?.toLowerCase()=="manager")){
         //       extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
         //       extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
         //    }
         //    const extractType = await Employee.aggregate([
         //       {
         //          $match: {
         //             $or: [
         //              ...extactMatchQuery
         //             ]
         //          }
         //       },
         //       // {
         //       //    $group: {
         //       //       _id: null,
         //       //       shareEmp: { $push: "$_id" },
         //       //    }
         //       // },
         //       // {
         //       //    $lookup: {
         //       //       from: "partners",
         //       //       let: { shareEmp: "$shareEmp" },
         //       //       pipeline: [
         //       //          {
         //       //             $match: {
         //       //                $expr: {
         //       //                   $or: [
         //       //                      { $in: ["$salesId", "$$shareEmp"] },
         //       //                      { $in: ["$shareEmployee", "$$shareEmp"] }
         //       //                   ]
         //       //                }
         //       //             }
         //       //          }
         //       //       ],
         //       //       as: "partners"
         //       //    }
         //       // },
         //       // {
         //       //    $lookup: {
         //       //       from: "clients",
         //       //       let: { shareEmp: "$shareEmp" },
         //       //       pipeline: [
         //       //          {
         //       //             $match: {
         //       //                $expr: {
         //       //                   $or: [
         //       //                      { $in: ["$salesId", "$$shareEmp"] },

         //       //                   ]
         //       //                }
         //       //             }
         //       //          }
         //       //       ],
         //       //       as: "allClients"
         //       //    }
         //       // },
         //       // {
         //       //    $project: {
         //       //       shareEmp: 1,
         //       //       _id: 0,
         //       //       allClients: {
         //       //          $map: {
         //       //             input: "$allClients",
         //       //             as: "allClients",
         //       //             in: "$$allClients._id"
         //       //          }
         //       //       },
         //       //       allPartners: {
         //       //          $map: {
         //       //             input: "$partners",
         //       //             as: "partner",
         //       //             in: "$$partner._id"
         //       //          }
         //       //       }
         //       //    }
         //       // },
         //       // {
         //       //    $project: {
         //       //       shareEmp: { $map: { input: "$shareEmp", as: "id", in: { $toString: "$$id" } } },
         //       //       allPartners: { $map: { input: "$allPartners", as: "id", in: { $toString: "$$id" } } },
         //       //       allClients: { $map: { input: "$allClients", as: "id", in: { $toString: "$$id" } } }
         //       //    }
         //       // }
         //       {
         //          "$group": {
         //              "_id": null,
         //              "shareEmpStr": { "$push": { "$toString": "$_id" } },
         //              "shareEmpObj": { "$push": "$_id" }
         //          }
         //      },
         //      {
         //          "$lookup": {
         //             from: "partners",
         //             let: { shareEmpStr: "$shareEmpStr", shareEmpObj: "$shareEmpObj" },
         //             pipeline: [
         //                 {
         //                     $match: {
         //                         $expr: {
         //                             $or: [
         //                                 { $in: ["$salesId", "$$shareEmpObj"] }, // Use ObjectId array for salesId
         //                                 {
         //                                     $gt: [
         //                                         {
         //                                             $size: {
         //                                                 $filter: {
         //                                                     input: { $ifNull: ["$shareEmployee", []] }, // Ensure shareEmployee is an array
         //                                                     as: "shareEmployeeId",
         //                                                     cond: { $in: ["$$shareEmployeeId", "$$shareEmpStr"] }
         //                                                 }
         //                                             }
         //                                         },
         //                                         0
         //                                     ]
         //                                 }
         //                             ]
         //                         }
         //                     }
         //                 }
         //             ],
         //             as: "partners"
         //          }
         //      },
         //       {
         //          $lookup: {
         //             from: "clients",
         //             let: { shareEmpObj: "$shareEmpObj" },
         //             pipeline: [
         //                {
         //                   $match: {
         //                      $expr: {
         //                         $or: [
         //                            { $in: ["$salesId", "$$shareEmpObj"] },

         //                         ]
         //                      }
         //                   }
         //                }
         //             ],
         //             as: "allClients"
         //          }
         //       },
         //       {
         //          $project: {
         //             shareEmpObj: 1,
         //             _id: 0,
         //             allClients: {
         //                $map: {
         //                   input: "$allClients",
         //                   as: "allClients",
         //                   in: "$$allClients._id"
         //                }
         //             },
         //             allPartners: {
         //                $map: {
         //                   input: "$partners",
         //                   as: "partner",
         //                   in: "$$partner._id"
         //                }
         //             }
         //          }
         //       },
         //       {
         //          $project: {
         //             shareEmp: { $map: { input: "$shareEmpObj", as: "id", in: { $toString: "$$id" } } },
         //             allPartners: { $map: { input: "$allPartners", as: "id", in: { $toString: "$$id" } } },
         //             allClients: { $map: { input: "$allClients", as: "id", in: { $toString: "$$id" } } }
         //          }
         //       }
         //    ])

         //    if (startDate && endDate) {
         //       const validStartDate = getValidateDate(startDate)
         //       if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         //       const validEndDate = getValidateDate(endDate)
         //       if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
         //    }

         //    let query = {
         //       $and: [
         //          { isPartnerReferenceCase: false },
         //          { isEmpSaleReferenceCase: false },
         //          { currentStatus: { $regex: statusType, $options: "i" } },
         //          { isActive: true },
         //          { branchId: { $regex: employee?.branchId, $options: "i" } },
         //          {
         //             $or: [
         //                { empSaleId: { $in: extractType?.[0]?.shareEmp } },
         //                { partnerId: { $in: extractType?.[0]?.allPartners } },
         //                { clientId: { $in: extractType?.[0]?.allClients } },
         //             ]
         //          },
         //          {
         //             $or: [
         //                { name: { $regex: searchQuery, $options: "i" } },
         //                { partnerName: { $regex: searchQuery, $options: "i" } },
         //                { consultantCode: { $regex: searchQuery, $options: "i" } },
         //                { fileNo: { $regex: searchQuery, $options: "i" } },
         //                { email: { $regex: searchQuery, $options: "i" } },
         //                { mobileNo: { $regex: searchQuery, $options: "i" } },
         //                { policyType: { $regex: searchQuery, $options: "i" } },
         //                { caseFrom: { $regex: searchQuery, $options: "i" } },
         //                { branchId: { $regex: searchQuery, $options: "i" } },
         //             ]
         //          },
         //          startDate && endDate ? {
         //             createdAt: {
         //                $gte: new Date(startDate).setHours(0, 0, 0, 0),
         //                $lte: new Date(endDate).setHours(23, 59, 59, 999)
         //             }
         //          } : {}
         //       ]
         //    };
         //  getAllCase = await Case.find(query).sort({ createdAt: -1 })



         if (startDate && endDate) {
            const validStartDate = getValidateDate(startDate)
            if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
            const validEndDate = getValidateDate(endDate)
            if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
         }

         const matchQuery = []

         if (startDate && endDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(23, 59, 59, 999);

            matchQuery.push({
               createdAt: {
                  $gte: new Date(start),
                  $lte: new Date(end)
               }
            });
         }

         if (branchWise) {
            // const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, isNormalEmp && empId, true, false,!isNormalEmp && empBranchId)
            // if (!query.success) return res.status(400).json({ success: false, message: query.message })

            // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
            // const noOfCase = await Case.find(query?.query).count()
            // return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });

            if (isNormalEmp && empId) {
               matchQuery.push({ addEmployee: { $in: empId } })
            }

         } else {

            let extactMatchQuery = [
               { referEmpId: findEmp?._id ? findEmp?._id : employee?._id },
               { _id: findEmp?._id ? findEmp?._id : employee?._id }
            ]

            if ((!findEmp && employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "manager") ||
               (findEmp && findEmp?.type?.toLowerCase() == "sales" && findEmp?.designation?.toLowerCase() == "manager")) {
               extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
               extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
            }

            // console.log("extactMatchQuery----",extactMatchQuery);
            const extractType = await Employee.aggregate([
               {
                  $match: {
                     $or: [
                        ...extactMatchQuery
                     ]
                  }
               },
               {
                  "$group": {
                     "_id": null,
                     "shareEmpStr": { "$push": { "$toString": "$_id" } },
                     "shareEmpObj": { "$push": "$_id" }
                  }
               },
               {
                  "$lookup": {
                     from: "partners",
                     let: { shareEmpStr: "$shareEmpStr", shareEmpObj: "$shareEmpObj" },
                     pipeline: [
                        {
                           $match: {
                              $expr: {
                                 $or: [
                                    { $in: ["$salesId", "$$shareEmpObj"] }, // Use ObjectId array for salesId
                                    {
                                       $gt: [
                                          {
                                             $size: {
                                                $filter: {
                                                   input: { $ifNull: ["$shareEmployee", []] }, // Ensure shareEmployee is an array
                                                   as: "shareEmployeeId",
                                                   cond: { $in: ["$$shareEmployeeId", "$$shareEmpStr"] }
                                                }
                                             }
                                          },
                                          0
                                       ]
                                    }
                                 ]
                              }
                           }
                        }
                     ],
                     as: "partners"
                  }
               },
               {
                  $lookup: {
                     from: "clients",
                     let: { shareEmpObj: "$shareEmpObj" },
                     pipeline: [
                        {
                           $match: {
                              $expr: {
                                 $or: [
                                    { $in: ["$salesId", "$$shareEmpObj"] },

                                 ]
                              }
                           }
                        }
                     ],
                     as: "allClients"
                  }
               },
               {
                  $project: {
                     shareEmpObj: 1,
                     _id: 0,
                     allClients: {
                        $map: {
                           input: "$allClients",
                           as: "allClients",
                           in: "$$allClients._id"
                        }
                     },
                     allPartners: {
                        $map: {
                           input: "$partners",
                           as: "partner",
                           in: "$$partner._id"
                        }
                     }
                  }
               },
               {
                  $project: {
                     shareEmp: { $map: { input: "$shareEmpObj", as: "id", in: { $toString: "$$id" } } },
                     allPartners: { $map: { input: "$allPartners", as: "id", in: { $toString: "$$id" } } },
                     allClients: { $map: { input: "$allClients", as: "id", in: { $toString: "$$id" } } }
                  }
               }

            ])

            matchQuery.push({
               $or: [
                  { empSaleId: { $in: extractType?.[0]?.shareEmp } },
                  { partnerId: { $in: extractType?.[0]?.allPartners } },
                  { clientId: { $in: extractType?.[0]?.allClients } },
               ]
            },)
         }

         const pipeline = [
            {
               $match: {
                  $and: [
                     { isPartnerReferenceCase: false },
                     { isEmpSaleReferenceCase: false },
                     { currentStatus: { $regex: statusType, $options: "i" } },
                     { isActive: true },
                     { branchId: { $regex: employee?.branchId, $options: "i" } },
                     ...matchQuery,
                  ]
               }
            },
            {
               $addFields: {
                  validPartnerIdString: {
                     $cond: {
                        if: {
                           $and: [
                              { $eq: [{ $type: "$partnerId" }, "string"] }, // Ensure partnerId is of type string
                              { $ne: ["$partnerId", ""] }, // Ensure partnerId is not an empty string
                              { $eq: [{ $strLenCP: "$partnerId" }, 24] } // Ensure it has exactly 24 characters
                           ]
                        },
                        then: "$partnerId",
                        else: null
                     }
                  }
               }
            },
            {
               $lookup: {
                  from: 'partners',
                  let: { partnerIdString: "$validPartnerIdString" },
                  pipeline: [
                     {
                        $match: {
                           $expr: {
                              $and: [
                                 { $ne: ["$$partnerIdString", null] }, // Ensure partnerIdString is not null
                                 { $ne: ["$$partnerIdString", ""] }, // Ensure partnerIdString is not an empty string
                                 {
                                    $eq: [
                                       "$_id",
                                       { $toObjectId: "$$partnerIdString" }
                                    ]
                                 }
                              ]
                           }
                        }
                     },
                     {
                        $project: {
                           fullName: 1 // Include only the fullName field
                        }
                     }
                  ],
                  as: 'partnerDetails'
               }
            },
            {
               '$unwind': {
                  'path': '$partnerDetails',
                  'preserveNullAndEmptyArrays': true
               }
            },
            {
               $addFields: {
                  validSaleEmpIdString: {
                     $cond: {
                        if: {
                           $and: [
                              { $eq: [{ $type: "$empSaleId" }, "string"] }, // Ensure partnerId is of type string
                              { $ne: ["$empSaleId", ""] }, // Ensure partnerId is not an empty string
                              { $eq: [{ $strLenCP: "$empSaleId" }, 24] } // Ensure it has exactly 24 characters
                           ]
                        },
                        then: "$empSaleId",
                        else: null
                     }
                  }
               }
            },
            {
               $lookup: {
                  from: 'employees',
                  let: { saleEmpIdString: "$validSaleEmpIdString" },
                  pipeline: [
                     {
                        $match: {
                           $expr: {
                              $and: [
                                 { $ne: ["$$saleEmpIdString", null] }, // Ensure partnerIdString is not null
                                 { $ne: ["$$saleEmpIdString", ""] }, // Ensure partnerIdString is not an empty string
                                 {
                                    $eq: [
                                       "$_id",
                                       { $toObjectId: "$$saleEmpIdString" }
                                    ]
                                 }
                              ]
                           }
                        }
                     },
                     {
                        $project: {
                           fullName: 1, // Include only the fullName field
                           designation: 1,
                           type: 1
                        }
                     }
                  ],
                  as: 'employeeDetails'
               }
            },
            {
               '$unwind': {
                  'path': '$employeeDetails',
                  'preserveNullAndEmptyArrays': true
               }
            },
            {
               '$match': {
                  '$or': [
                     { name: { $regex: searchQuery, $options: "i" } },
                     { 'partnerDetails.fullName': { $regex: searchQuery, $options: "i" } },
                     { 'employeeDetails.fullName': { $regex: searchQuery, $options: "i" } },
                     { consultantCode: { $regex: searchQuery, $options: "i" } },
                     { fileNo: { $regex: searchQuery, $options: "i" } },
                     { email: { $regex: searchQuery, $options: "i" } },
                     { mobileNo: { $regex: searchQuery, $options: "i" } },
                     { policyType: { $regex: searchQuery, $options: "i" } },
                     { caseFrom: { $regex: searchQuery, $options: "i" } },
                     { branchId: { $regex: searchQuery, $options: "i" } },
                  ]
               }
            },
            { '$sort': { 'createdAt': -1 } },
            //  {
            //    $lookup:{
            //       from: "casestatuses",
            //       localField: "_id",
            //       foreignField: "caseId",
            //       as: "casestatuses",
            //       pipeline:[
            //          {
            //             $project:{
            //                remark:1,
            //                date:1,
            //                status:1,
            //                createdAt:1
            //             }
            //          },
            //          {
            //             $sort:{
            //                createdAt:-1
            //             }
            //          },
            //          {
            //             $limit:1
            //          }
            //       ]
            //    }
            //  },
            // {
            //   $facet: {
            //     cases: [
            //       { $sort: { createdAt: -1 } },
            //       { $skip: Number(pageNo) },
            //       { $limit: Number(pageItemLimit) },
            //       { 
            //         $project: {
            //           caseDocs: 0,
            //           processSteps: 0,
            //           addEmployee: 0,
            //           caseCommit: 0,
            //           partnerReferenceCaseDetails: 0
            //         }
            //       }
            //     ],
            //     totalCount: [
            //       { $count: "count" }
            //     ]
            //   }
            // }
         ];

         const result = await Case.aggregate(pipeline);
         //  const getAllCase = result[0].cases;
         //  const noOfCase = result[0].totalCount[0]?.count || 0;

         const excelBuffer = await getDownloadCaseExcel(result, findEmp?._id ? findEmp?._id?.toString() : employee?._id?.toString())
         res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         res.send(excelBuffer)
      }
   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const employeeDownloadAllPartner = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const startDate = req.query.startDate
      const endDate = req.query.endDate

      const searchQuery = req.query.search ? req.query.search : "";
      const caseAccess = ["operation", "finance", "branch"]
      let empId = req?.query?.empId == "false" ? false : req?.query?.empId;
      let empBranchId = false;
      let branchWise = false
      let findEmp = false
      let isNormalEmp = false


      //  for specific employee case 
      if (empId) {
         if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id" })
         const getEmp = await Employee.findById(empId)
         if (!getEmp) return res.status(400).json({ success: false, message: "Searching employee account not found" })
         findEmp = getEmp
         if (caseAccess?.includes(findEmp?.type?.toLowerCase())) {
            console.log("if---");
            empBranchId = getEmp?.branchId
            branchWise = true
         } else if (findEmp?.type?.toLowerCase() != "sales" && findEmp?.type?.toLowerCase() != "sathi team") {
            console.log("else---");
            empId = req.query?.empId
            empBranchId = employee?.branchId
            branchWise = true
            isNormalEmp = true
         }
      }

      if (caseAccess?.includes(req?.user?.empType?.toLowerCase()) && !empId) {
         empBranchId = employee?.branchId
         branchWise = true
         empId = false
      } else {
         if (employee?.type?.toLowerCase() != "sales" && employee?.type?.toLowerCase() != "sathi team" && !empId) {
            if (!validMongooseId(req.query?.empId)) return res.status(400).json({ success: false, message: "Not a valid employee Id" })
            empId = req.query?.empId
            empBranchId = employee?.branchId
            branchWise = true
         }
      }
      if (branchWise) {
         const query = getAllPartnerSearchQuery(searchQuery, true, isNormalEmp && empId, startDate, endDate, !isNormalEmp && empBranchId)
         if (!query.success) return res.status(400).json({ success: false, message: query.message })
         const getAllPartner = await Partner.find(query?.query).sort({ createdAt: -1 }).populate("salesId", "fullName type designation")
         // Generate Excel buffer
         const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner, findEmp?._id?.toString() || employee?._id?.toString());
         res.setHeader('Content-Disposition', 'attachment; filename="partners.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         res.send(excelBuffer)

      } else {

         let extactMatchQuery = [
            { referEmpId: findEmp?._id ? findEmp?._id : employee?._id },
            { _id: findEmp?._id ? findEmp?._id : employee?._id }
         ]

         if (!findEmp && employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "manager" ||
            (findEmp && findEmp?.type?.toLowerCase() == "sales" && findEmp?.designation?.toLowerCase() == "manager")) {
            extactMatchQuery.push({ type: { $regex: "sales", $options: "i" } })
            extactMatchQuery.push({ type: { $regex: "sathi team", $options: "i" } })
         }
         const extractType = await Employee.aggregate([
            {
               $match: {
                  $or: [
                     ...extactMatchQuery
                  ]
               }
            },
            {
               $group: {
                  _id: null,
                  shareEmp: { $push: "$_id" },
                  shareEmpId: { $push: "$_id" },
               }
            },
            {
               $project: {
                  shareEmp: 1,
                  shareEmpId: 1,
                  _id: 0,
               }
            },
            {
               $project: {
                  shareEmpId: 1,
                  shareEmp: { $map: { input: "$shareEmp", as: "id", in: { $toString: "$$id" } } },
               }
            }

         ])

         if (startDate && endDate) {
            const validStartDate = getValidateDate(startDate)
            if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
            const validEndDate = getValidateDate(endDate)
            if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
         }

         let query = {
            $and: [
               { isActive: true },
               { branchId: { $regex: employee?.branchId, $options: "i" } },
               {
                  $or: [
                     { salesId: { $in: extractType?.[0]?.shareEmpId } },
                     { shareEmployee: { $in: extractType?.[0]?.shareEmp } },
                     // { partnerId: { $in: extractType?.[0]?.allPartners } },
                  ]
               },
               {
                  $or: [
                     { "profile.consultantName": { $regex: searchQuery, $options: "i" } },
                     { "profile.workAssociation": { $regex: searchQuery, $options: "i" } },
                     { "profile.consultantCode": { $regex: searchQuery, $options: "i" } },
                     { "profile.primaryMobileNo": { $regex: searchQuery, $options: "i" } },
                     { "profile.primaryEmail": { $regex: searchQuery, $options: "i" } },
                     { "profile.aadhaarNo": { $regex: searchQuery, $options: "i" } },
                     { "profile.panNo": { $regex: searchQuery, $options: "i" } },
                     { branchId: { $regex: searchQuery, $options: "i" } },
                  ]
               },
               startDate && endDate ? {
                  createdAt: {
                     $gte: new Date(startDate).setHours(0, 0, 0, 0),
                     $lte: new Date(endDate).setHours(23, 59, 59, 999)
                  }
               } : {}
            ]
         };
         const getAllPartner = await Partner.find(query).sort({ createdAt: -1 }).populate("salesId", "fullName type designation")
         // Generate Excel buffer
         const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner, findEmp?._id?.toString() || employee?._id?.toString());
         res.setHeader('Content-Disposition', 'attachment; filename="partners.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         res.send(excelBuffer)
      }

   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

// old version
// export const empViewAllEmployee = async (req, res) => {
//    try {
//       const { employee } = req

//       const searchQuery = req.query.search ? req.query.search : "";
//       const pageItemLimit = req.query.limit ? req.query.limit : 10;
//       const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
//       const type = req.query.type ? req.query.type : true;

//       const caseAccess = ["operation", "finance", "branch"]
//       let department = false
//       let query = {}
//       if (caseAccess?.includes(req?.user?.empType?.toLowerCase())) {
//          query = getAllEmployeeSearchQuery(searchQuery, true, department, false, employee?.branchId)
//       } else {
//          query = {
//             $and: [
//                { isActive: true },
//                employee?.designation?.toLowerCase() == "executive" ? { referEmpId: { $in: [employee?._id] } } : {},
//                { branchId: { $regex: employee?.branchId, $options: "i" } },
//                employee?.designation?.toLowerCase() == "manager" ? {
//                   $or: [
//                      { type: { $regex: "sales", $options: "i" } },
//                      { type: { $regex: "sathi team", $options: "i" } },
//                   ]
//                } : {},
//                {
//                   $or: [
//                      { fullName: { $regex: searchQuery, $options: "i" } },
//                      { email: { $regex: searchQuery, $options: "i" } },
//                      { mobileNo: { $regex: searchQuery, $options: "i" } },
//                      { branchId: { $regex: searchQuery, $options: "i" } },
//                      { type: { $regex: searchQuery, $options: "i" } },
//                      { designation: { $regex: searchQuery, $options: "i" } },
//                   ]
//                }
//             ]
//          }
//       }

//       const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("referEmpId", "fullName type designation");
//       const noOfEmployee = await Employee.find(query).count()
//       return res.status(200).json({ success: true, message: "get employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

//    } catch (error) {
//       console.log("adminViewAllEmployee in error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// }

export const empViewAllEmployee = async (req, res) => {
   try {
      const { employee } = req
      let { limit = 10, search = "", pageNo = 1, type = "", empType = "" } = req.query
      pageNo = (pageNo - 1) * limit;
      type = type || true;
      empType = empType || false
      const caseAccess = ["operation", "finance", "branch"]

      let matchQuery = []
      const {designation="",referEmpId="",branchId=""} = employee
      matchQuery.push({ branchId: { $regex: branchId, $options: "i" } })
      if(!caseAccess?.includes(employee?.type?.toLowerCase())){
         if (designation?.toLowerCase() == "executive") {
            matchQuery.push(
               {
                  $or: [
                     { referEmpId: { $in: [employee?._id] } },
                     { headEmpId: employee?._id },
                     { managerId: employee?._id },
                  ]
               }
            )
         }
         if (designation?.toLowerCase() == "manager") {
            matchQuery.push(
               {
                  $or: [
                     { type: { $regex: "sales", $options: "i" } },
                     { type: { $regex: "sathi team", $options: "i" } },
                     { headEmpId: employee?._id },
                     { managerId: employee?._id },
                  ]
               }
            )
         }
      }

      const pipeline = [
         {
            "$match": {
               "isActive": true,
               "$and":matchQuery,
               "$or": [
                  { "fullName": { "$regex": search, "$options": "i", }, },
                  { "email": { "$regex": search, "$options": "i", }, },
                  { "mobileNo": { "$regex": search, "$options": "i", }, },
                  { "type": { "$regex": search, "$options": "i", }, },
                  { "designation": { "$regex": search, "$options": "i", }, },
               ],
            },
         },
         {
            "$lookup": {
               "from": 'employees',
               "localField": "referEmpId",
               "foreignField": "_id",
               "pipeline": [
                  {
                     "$project": {
                        "fullName": 1,
                        "type": 1,
                        "designation": 1,

                     }
                  }
               ],
               "as": 'referEmpId'
            }
         },
         {
            '$unwind': {
               'path': '$referEmpId',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            "$lookup": {
               "from": 'employees',
               "localField": "headEmpId",
               "foreignField": "_id",
               "pipeline": [
                  {
                     "$project": {
                        "fullName": 1,
                        "type": 1,
                        "designation": 1,

                     }
                  }
               ],
               "as": 'headEmpId'
            }
         },
         {
            '$unwind': {
               'path': '$headEmpId',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            "$lookup": {
               "from": 'employees',
               "localField": "managerId",
               "foreignField": "_id",
               "pipeline": [
                  {
                     "$project": {
                        "fullName": 1,
                        "type": 1,
                        "designation": 1,

                     }
                  }
               ],
               "as": 'managerId'
            }
         },
         {
            '$unwind': {
               'path': '$managerId',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            "$project": {
               "fullName": 1,
               "email": 1,
               "empId":1,
               "mobileNo": 1,
               "type": 1,
               "designation": 1,
               "branchId": 1,
               "referEmpId": 1,
               "createdAt": 1,
               "managerId":1,
               "headEmpId":1
            },
         },
         {
            "$facet": {
               "data": [
                  { "$sort": { "createdAt": -1, }, },
                  { "$skip": Number(pageNo), },
                  { "$limit": Number(limit), },
               ],
               "totalCount": [
                  { "$count": "count", },
               ],
            },
         },
      ]
      const result = await Employee.aggregate(pipeline)
      console.log("data",result?.[0]?.data);
      
      return res.status(200).json({ success: true, message: "get employee data", data: result?.[0]?.data || [], noOfEmployee: result?.[0]?.totalCount?.[0]?.count || 0 });
   } catch (error) {
      console.log("empViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const empDownloadAllEmployee = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const searchQuery = req.query.search ? req.query.search : "";
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const type = req.query.type ? req.query.type : true;

      const caseAccess = ["operation", "finance", "branch"]
      let department = false
      let query = {}
      if (caseAccess?.includes(req?.user?.empType?.toLowerCase())) {
         query = getAllEmployeeSearchQuery(searchQuery, true, department, false, employee?.branchId)
      } else {
         query = {
            $and: [
               { isActive: true },
               employee?.designation?.toLowerCase() == "executive" ? { referEmpId: { $in: [employee?._id] } } : {},
               { branchId: { $regex: employee?.branchId, $options: "i" } },
               employee?.designation?.toLowerCase() == "manager" ? {
                  $or: [
                     { type: { $regex: "sales", $options: "i" } },
                     { type: { $regex: "sathi team", $options: "i" } },
                  ]
               } : {},
               {
                  $or: [
                     { fullName: { $regex: searchQuery, $options: "i" } },
                     { email: { $regex: searchQuery, $options: "i" } },
                     { mobileNo: { $regex: searchQuery, $options: "i" } },
                     { branchId: { $regex: searchQuery, $options: "i" } },
                     { type: { $regex: searchQuery, $options: "i" } },
                     { designation: { $regex: searchQuery, $options: "i" } },
                  ]
               }
            ]
         }
      }

      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("referEmpId", "fullName type designation");
      const excelBuffer = await getAllSathiDownloadExcel(JSON.parse(JSON.stringify(getAllEmployee)), "");
      res.setHeader('Content-Disposition', 'attachment; filename="sathi.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)
   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empViewSathiEmployee = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const searchQuery = req.query.search ? req.query.search : "";
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const empId = req.query.empId

      if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid Id" })
      const getEmp = await Employee.findById(empId)
      if (!getEmp) return res.status(400).json({ success: false, message: "Employee not found" })

      const caseAccess = ["operation", "finance", "branch"]
      let query = {}
      console.log(caseAccess?.includes(getEmp?.type?.toLowerCase()), "----");
      if (caseAccess?.includes(getEmp?.type?.toLowerCase())) {
         query = getEmployeeByIdQuery(searchQuery, "sathi team", employee?.branchId)
      } else {
         query = {
            $and: [
               { isActive: true },
               getEmp?.designation?.toLowerCase() == "executive" ? { referEmpId: getEmp?._id } : {},
               { branchId: { $regex: employee?.branchId, $options: "i" } },
               { type: { $regex: "sathi team", $options: "i" } },
               {
                  $or: [
                     { fullName: { $regex: searchQuery, $options: "i" } },
                     { email: { $regex: searchQuery, $options: "i" } },
                     { mobileNo: { $regex: searchQuery, $options: "i" } },
                     { branchId: { $regex: searchQuery, $options: "i" } },
                     { type: { $regex: searchQuery, $options: "i" } },
                     { designation: { $regex: searchQuery, $options: "i" } },
                  ]
               }
            ]
         }
      }

      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("referEmpId", "fullName type designation");
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const empDownloadSathiEmployee = async (req, res) => {
   try {
      const { employee } = req
      const searchQuery = req.query.search ? req.query.search : "";
      const empId = req.query.empId

      if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid Id" })
      const getEmp = await Employee.findById(empId)
      if (!getEmp) return res.status(400).json({ success: false, message: "Employee not found" })

      const caseAccess = ["operation", "finance", "branch"]
      let query = {}
      console.log(caseAccess?.includes(getEmp?.type?.toLowerCase()), "----");
      if (caseAccess?.includes(getEmp?.type?.toLowerCase())) {
         query = getEmployeeByIdQuery(searchQuery, "sathi team", employee?.branchId)
      } else {
         query = {
            $and: [
               { isActive: true },
               getEmp?.designation?.toLowerCase() == "executive" ? { referEmpId: getEmp?._id } : {},
               { branchId: { $regex: employee?.branchId, $options: "i" } },
               { type: { $regex: "sathi team", $options: "i" } },
               {
                  $or: [
                     { fullName: { $regex: searchQuery, $options: "i" } },
                     { email: { $regex: searchQuery, $options: "i" } },
                     { mobileNo: { $regex: searchQuery, $options: "i" } },
                     { branchId: { $regex: searchQuery, $options: "i" } },
                     { type: { $regex: searchQuery, $options: "i" } },
                     { designation: { $regex: searchQuery, $options: "i" } },
                  ]
               }
            ]
         }
      }

      const getAllEmployee = await Employee.find(query).select("-password").sort({ createdAt: -1 }).populate("referEmpId", "fullName type designation");
      const excelBuffer = await getAllSathiDownloadExcel(JSON.parse(JSON.stringify(getAllEmployee)), getEmp._id?.toString());
      res.setHeader('Content-Disposition', 'attachment; filename="sathi.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empChangeBranch = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      const { _id, branchId, type } = req.body;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      if (!branchId || !type) return res.status(400).json({ success: false, message: "Required BranchId and type" })

      if (type?.toLowerCase() == "client") {
         const getClient = await Client?.findById(_id)
         if (!getClient) return res.status(400).json({ success: false, message: "Client account not found" })

         await Client.findByIdAndUpdate(_id, { branchId: branchId?.trim() })
         await Case.updateMany({ clientId: _id }, { branchId: branchId?.trim() })
         await Bill.updateMany({ clientId: _id }, { branchId: branchId?.trim() })
         return res.status(200).json({ success: true, message: `Successfully Change Branch` });
      } else {
         const getPartner = await Partner?.findById(_id)
         if (!getPartner) return res.status(400).json({ success: false, message: "Partner account not found" })

         await Partner.findByIdAndUpdate(_id, { branchId: branchId?.trim() })
         await Case.updateMany({ partnerId: _id }, { branchId: branchId?.trim() })
         return res.status(200).json({ success: true, message: `Successfully Change Branch` });
      }

   } catch (error) {
      console.log("adminChangeBranch in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const empOptGetNormalEmployee = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";

      const excludedTypes = ["Sales", "Operation", "Finance", "Sathi Team", "Branch"];
      let query = {
         $and: [
            { isActive: true },
            { type: { $nin: excludedTypes } },
            { branchId: { $regex: employee?.branchId, $options: "i" } },
            {
               $or: [
                  { fullName: { $regex: searchQuery, $options: "i" } },
                  { email: { $regex: searchQuery, $options: "i" } },
                  { mobileNo: { $regex: searchQuery, $options: "i" } },
                  { type: { $regex: searchQuery, $options: "i" } },
                  { designation: { $regex: searchQuery, $options: "i" } },

               ]
            }
         ]
      };
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get normal employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("empOptGetNormalEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const empOptShareCaseToEmployee = async (req, res) => {
   try {
      const { employee } = req
      const { error } = validateAdminAddEmployeeToCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      // const updateCase = req.body?.shareCase?.map(caseShare => Case.findByIdAndUpdate(caseShare, { $push: { addEmployee: { $each: req?.body?.shareEmployee } } }, { new: true }))
      // console.log("updateCase", updateCase);
      // const allUpdateCase = await Promise.all(updateCase)

      const {shareCase=[],shareEmployee=[]} = req.body
      let bulkOps = []
      for (const toEmployeeId of shareEmployee) {
         const exists = await ShareSection.find({toEmployeeId,caseId:{$in:shareCase}},{caseId:1})
         let filter = shareClients?.filter(caseId=>!exists?.map(ele=>ele?.caseId?.toString())?.includes(caseId)) 
         filter?.forEach(caseId=>{
            bulkOps.push({
               insertOne:{
                  document:{
                     caseId,
                     toEmployeeId
                  }
               }
            })
         })
      }   
      await ShareSection.bulkWrite(bulkOps)
      return res.status(200).json({ success: true, message: "Successfully employee add to case" });
   } catch (error) {
      console.log("empOptShareCaseToEmployee  in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const createOrUpdateStatement = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      const caseAccess = ["operation", "finance"]
      if (!caseAccess.includes(employee?.type?.toLowerCase())) {
         return res.status(400).json({ success: false, message: "Access denied" })
      }


      const { _id, partnerEmail, empEmail, partnerId, empId } = req.body
      req.body.branchId = employee?.branchId

      let isExistStatement = {}
      if (_id) {
         isExistStatement = await Statement.findById(_id)
         if (!isExistStatement) {
            return res.status(400).json({ success: false, message: "Statment is not found" })
         }
      } else {
         if (partnerEmail || partnerId) {
            let filter = {}
            if (partnerEmail) { filter.email = { $regex: partnerEmail, $options: "i" } }
            if (partnerId) { filter._id = partnerId }
            const findPartner = await Partner.findOne({ $or: [filter] })
            if (!findPartner) return res.status(400).json({ success: false, message: "Partner is not found" })
            req.body.partnerId = findPartner._id?.toString()
            req.body.branchId = findPartner?.branchId
         } else if (empEmail || empId) {
            let filter = {}
            if (empEmail) { filter.email = { $regex: empEmail, $options: "i" } }
            if (empId) { filter._id = empId }
            const findEmp = await Employee.findOne({ $or: [filter] })
            if (!findEmp) return res.status(400).json({ success: false, message: "Employee is not found" })
            req.body.empId = findEmp._id?.toString()
            req.body.branchId = findEmp?.branchId
         }
         isExistStatement = new Statement({ isActive: true })
      }

      const updateKeys = ["empId", "partnerId", "caseLogin", "policyHolder", "fileNo", "policyNo", "insuranceCompanyName"
         , "claimAmount", "approvedAmt", "constultancyFee", "TDS", "modeOfLogin", "payableAmt", "utrDetails", "fileUrl", "branchId"]

      updateKeys.forEach(key => {
         if (req.body[key]) {
            isExistStatement[key] = req.body[key]
         }
      })

      await isExistStatement.save()
      return res.status(200).json({ success: true, message: `Successfully ${_id ? "update" : "create"} statement` });

   } catch (error) {
      console.log("createOrUpdateStatement in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

   }
}

export const getStatement = async (req, res) => {
   try {
      const { employee } = req
      const caseAccess = ["operation", "finance", "sathi team"]
      if (!caseAccess.includes(employee?.type?.toLowerCase())) {
         return res.status(400).json({ success: false, message: "Access denied" })
      }


      const { empId, partnerId, startDate, endDate, limit, pageNo, isPdf } = req.query
      const pageItemLimit = limit ? limit : 10;
      const page = pageNo ? (pageNo - 1) * pageItemLimit : 0;


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      let matchQuery = [{ branchId: { $regex: employee?.branchId, $options: 'i' } }]

      if (startDate && endDate) {
         const start = new Date(startDate).setHours(0, 0, 0, 0);
         const end = new Date(endDate).setHours(23, 59, 59, 999);

         matchQuery.push({
            createdAt: {
               $gte: new Date(start),
               $lte: new Date(end)
            }
         });
      }

      let statementOf = {}

      if (empId) {
         const emp = await Employee.findById(empId).select({
            'fullName': 1,
            'bankName': 1,
            'bankBranchName': 1,
            'bankAccountNo': 1,
            'panNo': 1,
            'address': 1,
            'branchId': 1,
            'empId': 1,
         })
            .populate("referEmpId", "fullName")
         if (!emp) {
            return res.status(400).json({ status: false, message: 'Employee not found' })
         }
         statementOf.employee = emp
         matchQuery.push({
            empId: new Types.ObjectId(empId)
         })
      }    

      if (partnerId) {
         const partner = await Partner.findById(partnerId,).select({
            'bankingDetails.bankName': 1,
            'bankingDetails.bankAccountNo': 1,
            'bankingDetails.bankBranchName': 1,
            'bankingDetails.panNo': 1,
            'bankingDetails.branchId': 1,
            'profile.consultantName': 1,
            'profile.consultantCode': 1,
            'profile.address': 1,
            'branchId': 1,
         }).populate("salesId", "fullName")
         if (!partner) {
            return res.status(400).json({ status: false, message: 'Partner not found' })
         }
         statementOf.partner = partner
         matchQuery.push({
            partnerId: new Types.ObjectId(partnerId)
         })
      }


      const allStatement = await Statement.aggregate([
         {
            $match: {
               $and: [
                  ...matchQuery,
                  { isActive: true }

               ]
            }
         },
         {
            $lookup: {
               from: 'partners',
               localField: 'partnerId',
               foreignField: '_id',
               as: 'partnerDetails',
               pipeline: [
                  {
                     $project: {
                        'profile.consultantName': 1,
                        'profile.consultantCode': 1,

                     }
                  }
               ]
            }
         },
         {
            $unwind: {
               path: '$partnerDetails',
               preserveNullAndEmptyArrays: true
            }
         },
         {
            $lookup: {
               from: 'employees',
               localField: 'empId',
               foreignField: '_id',
               as: 'empDetails',
               pipeline: [
                  {
                     $project: {
                        'fullName': 1,
                        'type': 1,
                     }
                  }
               ]
            }
         },
         {
            $unwind: {
               path: '$empDetails',
               preserveNullAndEmptyArrays: true
            }
         },
         { '$sort': { 'createdAt': -1 } },
         {
            $facet: {
               statement: [
                  ...(isPdf == "true" ? [] : [
                     { $skip: Number(page) },
                     { $limit: Number(pageItemLimit) }
                  ])
               ],
               total: [
                  { $count: "count" }
               ]
            }
         }
      ])

      const data = allStatement?.[0]?.statement
      const totalData = allStatement?.[0]?.total?.[0]?.count || 0

      return res.status(200).json({ success: true, message: `Successfully fetch all statement`, data: { data: data, totalData, statementOf } });

   } catch (error) {
      console.log("createOrUpdateStatement in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

   }
}

export const empDownloadAllStatement = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      const caseAccess = ["operation", "finance", "sathi team"]
      if (!caseAccess.includes(employee?.type?.toLowerCase())) {
         return res.status(400).json({ success: false, message: "Access denied" })
      }


      const { empId, partnerId, startDate, endDate } = req.query


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      let matchQuery = [{ branchId: { $regex: employee?.branchId, $options: 'i' } }]

      if (startDate && endDate) {
         const start = new Date(startDate).setHours(0, 0, 0, 0);
         const end = new Date(endDate).setHours(23, 59, 59, 999);

         matchQuery.push({
            createdAt: {
               $gte: new Date(start),
               $lte: new Date(end)
            }
         });
      }

      if (empId) {
         matchQuery.push({ empId: new Types.ObjectId(empId) })
      }

      if (partnerId) {
         matchQuery.push({ partnerId: new Types.ObjectId(partnerId) })
      }

      const pipeline = [
         {
            '$match': {
               '$and': [
                  ...matchQuery,
                  { 'isActive': true }
               ]
            }
         }, {
            '$lookup': {
               'from': 'partners',
               'localField': 'partnerId',
               'foreignField': '_id',
               'as': 'partnerDetails',
               'pipeline': [
                  {
                     '$lookup': {
                        'from': 'employees',
                        'localField': 'salesId',
                        'foreignField': '_id',
                        'as': 'referby',
                        'pipeline': [
                           {
                              '$project': {
                                 'fullName': 1,
                                 'email': 1,
                                 'type': 1
                              }
                           }
                        ]
                     }
                  }, {
                     '$unwind': {
                        'path': '$referby'
                     }
                  }, {
                     '$project': {
                        'bankName': '$bankingDetails.bankName',
                        'bankAccountNo': '$bankingDetails.bankAccountNo',
                        'bankBranchName': '$bankingDetails.bankBranchName',
                        'panNo': '$bankingDetails.panNo',
                        'bankBranchName': '$bankingDetails.bankBranchName',
                        'consultantName': '$profile.consultantName',
                        'consultantCode': '$profile.consultantCode',
                        'address': '$profile.address',
                        'branchId': 1,
                        'referby': 1
                     }
                  }
               ]
            }
         }, {
            '$unwind': {
               'path': '$partnerDetails',
               'preserveNullAndEmptyArrays': true
            }
         }, {
            '$lookup': {
               'from': 'employees',
               'localField': 'empId',
               'foreignField': '_id',
               'as': 'empDetails',
               'pipeline': [
                  {
                     '$lookup': {
                        'from': 'employees',
                        'localField': 'referEmpId',
                        'foreignField': '_id',
                        'as': 'referby',
                        'pipeline': [
                           {
                              '$project': {
                                 'fullName': 1,
                                 'email': 1,
                                 'type': 1
                              }
                           }
                        ]
                     }
                  }, {
                     '$unwind': {
                        'path': '$referby'
                     }
                  }, {
                     '$project': {
                        'fullName': 1,
                        'bankName': 1,
                        'bankAccountNo': 1,
                        'bankBranchName': 1,
                        'panNo': 1,
                        'address': 1,
                        'type': 1,
                        'email': 1,
                        'branchId': 1,
                        'empId': 1,
                        'referby': 1
                     }
                  }
               ]
            }
         }, {
            '$unwind': {
               'path': '$empDetails',
               'preserveNullAndEmptyArrays': true
            }
         }, {
            '$sort': {
               'createdAt': -1
            }
         }
      ]

      const allStatement = await Statement.aggregate(pipeline)

      const excelBuffer = await getAllStatementDownloadExcel(allStatement);
      res.setHeader('Content-Disposition', 'attachment; filename="statement.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)
   } catch (error) {
      console.log("downloadAllStatement error:", error);
      return res.status(500).json({ success: false, message: "Oops! something went wrong", error: error })

   }
}

export const getAllStatement = async (req, res) => {
   try {
      const { employee } = req
      const caseAccess = ["operation", "finance", "sathi team"]
      if (!caseAccess.includes(employee?.type?.toLowerCase())) {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { search, startDate, endDate, limit, pageNo } = req.query
      const pageItemLimit = limit ? limit : 10;
      const page = pageNo ? (pageNo - 1) * pageItemLimit : 0;


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      let matchQuery = [{ branchId: { $regex: employee?.branchId, $options: 'i' } }]

      if (startDate && endDate) {
         const start = new Date(startDate).setHours(0, 0, 0, 0);
         const end = new Date(endDate).setHours(23, 59, 59, 999);

         matchQuery.push({
            createdAt: {
               $gte: new Date(start),
               $lte: new Date(end)
            }
         });
      }

      if(employee?.type?.toLowerCase()=="sathi team"){
         matchQuery.push({empId:employee?._id})
      }

      const allStatement = await Statement.aggregate([
         {
            $match: {
               $and: [
                  ...matchQuery,
                  { isActive: true }

               ]
            }
         },
         {
            $lookup: {
               from: 'partners',
               localField: 'partnerId',
               foreignField: '_id',
               as: 'partnerDetails',
               pipeline: [
                  {
                     $project: {
                        'profile.consultantName': 1,
                        'profile.consultantCode': 1,
                     }
                  }
               ]
            }
         },
         {
            $unwind: {
               path: '$partnerDetails',
               preserveNullAndEmptyArrays: true
            }
         },
         {
            $lookup: {
               from: 'employees',
               localField: 'empId',
               foreignField: '_id',
               as: 'empDetails',
               pipeline: [
                  {
                     $project: {
                        'fullName': 1,
                        'type': 1,
                     }
                  }
               ]
            }
         },
         {
            $unwind: {
               path: '$empDetails',
               preserveNullAndEmptyArrays: true
            }
         },
         {
            $match: {
               $and: [
                  // Regex-based search after lookup
                  search ? {
                     $or: [
                        { 'partnerDetails.profile.consultantName': { $regex: search, $options: 'i' } },
                        { 'partnerDetails.profile.consultantCode': { $regex: search, $options: 'i' } },
                        { 'empDetails.fullName': { $regex: search, $options: 'i' } },
                     ]
                  } : { isActive: true }
               ]
            }
         },
         { '$sort': { 'createdAt': -1 } },
         {
            $facet: {
               statement: [
                  { $skip: Number(page) },
                  { $limit: Number(pageItemLimit) },
               ],
               total: [
                  { $count: "count" }
               ]
            }
         }
      ])

      const data = allStatement?.[0]?.statement
      const totalData = allStatement?.[0]?.total?.[0]?.count || 0

      return res.status(200).json({ success: true, message: `Successfully fetch all statement`, data: { data: data, totalData } });

   } catch (error) {
      console.log("createOrUpdateStatement in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

   }
}

//  notification section
export const getAllNotification = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const allNotification = await Notification.find({ empIds: { $nin: [req?.user?._id] } }).populate({
         path: "caseId",
         select: {
            fileNo: 1
         }
      }).sort({ createdAt: -1 })
      return res.status(200).json({ success: true, message: `Successfully fetch all notification`, data: allNotification });

   } catch (error) {
      console.log("getAllNotification in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

   }
}

export const updateNotification = async (req, res) => {
   try {
      const { employee } = req
      // const verify = await authEmployee(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const employee = await Employee.findById(req?.user?._id)
      // if (!employee) return res.status(401).json({ success: false, message: "Employee account not found" })
      // if (!employee?.isActive) return res.status(401).json({ success: false, message: "Employee account not active" })
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const markNotification = req.body?.markNotification || []

      await Notification.updateMany({ _id: { $in: markNotification } }, { $push: { empIds: req?.user?._id } })
      return res.status(200).json({ success: true, message: `Successfully mark as read notification` });

   } catch (error) {
      console.log("updateNotification in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

   }
}