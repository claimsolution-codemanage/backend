import axios from "axios";
import jwtDecode from "jwt-decode";
import mongoose, { Types } from "mongoose";
import ExcelJS from 'exceljs';
import bcrypt from 'bcrypt';
import { Readable } from 'stream';
import Jwt from 'jsonwebtoken'
// import { bucket } from "../index.js";
import { bucket } from "../firebase/config.js";

import { authAdmin } from "../middleware/authentication.js";

// function import
import {
   validateAdminSignUp, validateAdminSignIn, validateAdminResetPassword, validateUpdateAdminCase,
   validateAdminSettingDetails, validateAdminAddCaseFee, validateAdminUpdateCasePayment, validateAdminAddEmployeeToCase,
   validateEditAdminCaseStatus, validateAdminSharePartner, validateAdminRemovePartner,
} from "../utils/validateAdmin.js";
import { commonDownloadCaseExcel, commonInvoiceDownloadExcel, generatePassword, getAllCaseDocQuery, getAllClientResult, getAllInvoiceQuery, getAllPartnerResult, getAllSathiDownloadExcel, getAllStatementDownloadExcel, getEmployeeByIdQuery, getValidateDate, sendNotificationAndMail } from "../utils/helper.js";
import { sendAdminSigninMail, sendEmployeeSigninMail, sendForgetPasswordMail, sendMail } from "../utils/sendMail.js";
import { validateEmployeeSignUp } from "../utils/validateEmployee.js";
import { validMongooseId } from "../utils/helper.js";
import { validateResetPassword } from "../utils/helper.js";
import {
   getAllPartnerSearchQuery, getAllClientSearchQuery, getAllCaseQuery,
   getAllEmployeeSearchQuery, getDownloadCaseExcel, getAllPartnerDownloadExcel, getAllClientDownloadExcel
} from "../utils/helper.js";
import { validateAddClientCase, validateClientProfileBody } from "../utils/validateClient.js";
import { validateBankingDetailsBody, validateProfileBody } from "../utils/validatePatner.js";
import { firebaseUpload } from "../utils/helper.js";
import { validateInvoice } from "../utils/validateEmployee.js";

// model
import Employee from "../models/employee.js";
import Case from "../models/case/case.js";
import Partner from "../models/partner.js";
import Client from '../models/client.js'
import Admin from "../models/admin.js";
import Bill from "../models/bill.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import CaseComment from "../models/caseComment.js";
import Statement from "../models/statement.js";
import Notification from "../models/notification.js";
import CasePaymentDetails from "../models/casePaymentDetails.js";
import EmpDoc from "../models/empDoc.js";
import EmployeeJoiningForm from "../models/employeeJoiningForm.js";
import CasegroStatus from "../models/groStatus.js";
import { createOrUpdateCaseStatusForm } from "../utils/dbFunction.js";
import CaseOmbudsmanStatus from "../models/ombudsmanStatus.js";
import ShareSection from "../models/shareSection.js";
import * as dbFunction from "../utils/dbFunction.js"
import CaseMergeDetails from "../models/caseMergeDetails.js";


export const adminAuthenticate = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Account not found" })

      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

      return res.status(200).json({ success: true, message: "Authorized Admin" })
   } catch (error) {
      console.log("admin auth error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminUploadImage = async (req, res) => {
   try {
      firebaseUpload(req, res, "images");
   } catch (error) {
      console.log("adminUploadImage", error);
      return res.status(500).json({ success: false, message: "Oops something went wrong" });
   }
}

export const adminUploadAttachment = async (req, res) => {
   try {
      firebaseUpload(req, res, "attachments");
   } catch (error) {
      console.log("adminUploadAttachment", error);
      return res.status(500).json({ success: false, message: "Oops something went wrong" });
   }
}


export const adminSignUp = async (req, res) => {
   try {
      const { error } = validateAdminSignUp(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      // if(req.body.key!==process.env.ADMIN_SIGNUP_SECRET_KEY) return res.status(400).json({success:false,message:"Unauthorized access"})

      const admin = await Admin.find({ email: req.body.email?.trim()?.toLowerCase() })
      if (admin.length > 0) return res.status(401).json({ success: false, message: "Admin account already exists" })

      const systemPassword = generatePassword();
      const bcryptPassword = await bcrypt.hash(systemPassword, 10)
      const newAdmin = new Admin({
         fullName: req.body.fullName,
         email: req?.body?.email?.trim()?.toLowerCase(),
         mobileNo: req.body.mobileNo,
         password: bcryptPassword,
      })
      try {
         await sendAdminSigninMail(systemPassword, req?.body?.email?.toLowerCase());
         await newAdmin.save()
         res.status(200).json({ success: true, message: "Credentials send" });
      } catch (err) {
         console.log("send otp error", err);
         return res.status(400).json({ success: false, message: "Failed to send Credentials" });
      }
   } catch (error) {
      console.log("sign up error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


// const verify =  await authAdmin(req,res)
// if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

export const adminSignin = async (req, res) => {
   try {
      const { error } = validateAdminSignIn(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const admin = await Admin.find({ email: req?.body?.email?.trim()?.toLowerCase() })
      if (admin.length == 0) return res.status(404).json({ success: false, message: "Admin account not exists" })

      if (!admin[0]?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const checkAuthAdmin = await bcrypt.compare(req.body.password, admin?.[0]?.password)
      // console.log("admin",admin);
      if (!checkAuthAdmin) return res.status(401).json({ success: false, message: "invaild email/password" })
      const isSuperAdmin = req.body.email === process.env.ADMIN_MAIL_ID

      const token = await admin[0]?.getAuth(isSuperAdmin)

      return res.status(200).header("x-auth-token", token)
         .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully signIn" })
   } catch (error) {
      console.log("sign in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminResetPassword = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const { error } = validateAdminResetPassword(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { password, confirmPassword } = req.body
      if (password !== confirmPassword) return res.status(403).json({ success: false, message: "confirm password must be same" })
      const bcryptPassword = await bcrypt.hash(password, 10)

      const updateAdmin = await Admin.findByIdAndUpdate(req?.user?._id, { $set: { password: bcryptPassword } }, { new: true })
      if (!updateAdmin) return res.status(400).json({ success: false, message: "problem to reset password" })

      return res.status(200).json({ success: true, message: "Successfully reset password" })
   } catch (error) {
      console.log("sign in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const uploadCompanyClientTls = async (req, res) => {
   try {
      // const {admin} = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      if (!req.body.clientTlsUrl) return res.status(404).json({ success: false, message: "client tls not upload" });

      const admin = await Admin.findByIdAndUpdate(req?.user?._id, { clientTlsUrl: req.body.clientTlsUrl }, { new: true }).select("-password")
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      return res.status(200).json({ success: true, message: 'Successfull upload client tls', data: admin });
   } catch (error) {
      console.log("uploadCompanyClientTls in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const uploadCompanyPartnerTls = async (req, res) => {
   try {
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      if (!req.body.partnerTlsUrl) return res.status(404).json({ success: false, message: "parnter tls not upload" });

      const admin = await Admin.findByIdAndUpdate(req?.user?._id, { partnerTlsUrl: req.body.partnerTlsUrl }, { new: true }).select("-password")
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      return res.status(200).json({ success: true, message: 'Successfull upload partner tls', data: admin });
   } catch (error) {
      console.log("uploadCompanyPartnerTls in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const getSettingDetails = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id).select("-password")
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



      return res.status(200).json({ success: true, message: 'get admin profile', data: admin });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}

// export const adminDashboard= async(req,res)=>{
//    try {
//       const verify =  await authAdmin(req,res)
//       if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

//       const admin = await Admin.findById(req?.user?._id)
//       if(!admin) return res.status(401).json({success: false, message:"Admin account not found"})

//       const sevenMonthsAgo = new Date();
//       sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

//       const pieChartData = await Case.aggregate([
//          {
//            '$group': {
//              '_id': '$currentStatus', 
//              'totalCases': {
//                '$sum': 1
//              }
//            }
//          }, {
//            '$group': {
//              '_id': null, 
//              'totalCase': {
//                '$sum': '$totalCases'
//              }, 
//              'allCase': {
//                '$push': '$$ROOT'
//              }
//            }
//          }
//        ])
//    const graphData = await Case.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: sevenMonthsAgo } // Assuming 'createdAt' is your date field
//         }
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: '$createdAt' },
//             month: { $month: '$createdAt' }
//           },
//           totalCases: { $sum: 1 }
//         }
//       },
//       {
//         $sort: { '_id.year': 1, '_id.month': 1 } // Optional: Sort by year and month
//       },])

//     return res.status(200).json({success:true,message:"get dashbaord data",graphData,pieChartData});

//    } catch (error) {
//       console.log("updateAdminCase in error:",error);
//       res.status(500).json({success:false,message:"Internal server error",error:error});

//    }
// }

export const adminDashboard = async (req, res) => {
   try {
      const { admin } = req
      const noOfClient = await Client.find({ isActive: true }).count()
      const noOfPartner = await Partner.find({ isActive: true }).count()
      const noOfEmployee = await Employee.find({ isActive: true }).count()
      // let currentYear = new Date().getFullYear()
      // const currentYearStart = new Date(new Date(new Date().setFullYear(year || currentYear)).getFullYear(), 0, 1); // Start of the current year
      // const currentMonth = year == currentYear ? new Date().getMonth() + 1 : 12;

      const year = Number(req.query.year || new Date().getFullYear());
      const startYear = Number(year || 2024); // default April 2024
      const endYear = Number(startYear + 1);     // default March 2035

      // Dates range
      const financialYearStart = new Date(startYear, 3, 1); // April 1 startYear
      const financialYearEnd = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31 endYear
      const currentYear = new Date().getFullYear();


      const allMonths = [];
      const currentMonth = new Date().getMonth();
      const totalMonths = currentYear == year && currentMonth > 2 ? currentMonth - 2 : (endYear - startYear - 1) * 12 + 12;

      for (let i = 0; i < totalMonths; i++) {
         const date = new Date(financialYearStart);
         date.setMonth(date.getMonth() + i);
         allMonths.push({
            _id: {
               year: date.getFullYear(),
               month: date.getMonth() + 1
            },
            totalCases: 0
         });
      }

      const pieChartData = await Case.aggregate([
         {
            '$match': {
               'createdAt': {
                  $gte: financialYearStart,
                  $lte: financialYearEnd,
               },
               'isActive': true,
               'isPartnerReferenceCase': false,
               'isEmpSaleReferenceCase': false,

            }
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
            $match: {
               'createdAt': {
                  $gte: financialYearStart,
                  $lte: financialYearEnd,
               },
               'isActive': true,
               'isPartnerReferenceCase': false,
               'isEmpSaleReferenceCase': false,
            }
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

      return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData, noOfClient, noOfPartner, noOfEmployee });
   } catch (error) {
      console.log("get dashbaord data error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
};


export const adminSettingDetailsUpdate = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const { error } = validateAdminSettingDetails(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const updateClient = await Admin.findByIdAndUpdate(req?.user?._id, {
         $set: {
            fullName: req.body.fullName,
            email: req.body.email,
            mobileNo: req.body.mobileNo,
            consultantFee: req.body.consultantFee
         }
      }, { new: true })
      if (!updateClient) return res.status(401).json({ success: false, message: "Admin account not found" })


      return res.status(200).json({ success: true, message: `Successfully update Setting` });
   } catch (error) {
      console.log("adminSetCaseFee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}



export const adminSetIsActiveEmployee = async (req, res) => {
   try {
      const { admin } = req

      const { _id, status } = req.query
      if (!_id || !status) return res.status(400).json({ success: false, message: "required employee id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updateEmployee = await Employee.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateEmployee) return res.status(404).json({ success: false, message: "Employee not found" })

      return res.status(200).json({ success: true, message: `Now employee ${updateEmployee?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const createEmployeeAccount = async (req, res) => {
   try {
      const { admin } = req
      const { error } = validateEmployeeSignUp(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      const { fullName = "", email = "", mobileNo = "", type = "", designation = "", empId = "", branchId = "", headEmpId = "", managerId = "" } = req.body

      const existEmployee = await Employee.findOne({ $or: [{ email: { $regex: email, $options: "i" } }, { empId: { $regex: empId, $options: "i" } }] })
      if (existEmployee) return res.status(401).json({ success: false, message: "Employee account/empId already exists" })

      const systemPassword = generatePassword()
      const bcryptPassword = await bcrypt.hash(systemPassword, 10)
      const newEmployee = new Employee({
         fullName: fullName?.trim(),
         empId: empId?.trim(),
         branchId: branchId?.trim(),
         email: email?.trim()?.toLowerCase(),
         mobileNo: mobileNo,
         password: bcryptPassword,
         type: type || "assistant",
         designation: designation || "executive"
      })

      if (managerId) newEmployee.managerId = managerId
      if (headEmpId) newEmployee.headEmpId = headEmpId

      try {
         await sendEmployeeSigninMail(req.body.email, systemPassword);
         // console.log(systemPassword,"systemPassword---------");
         await newEmployee.save()
         return res.status(200).json({ success: true, message: "Successfully create new Employee", });
      } catch (err) {
         console.log("send otp error", err);
         return res.status(400).json({ success: false, message: "Failed to send OTP" });
      }


   } catch (error) {
      console.log("createEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminEmployeeProfile = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ status: false, message: "Not a valid Id" })

      const pipeline = [
         {
            '$match': {
               '_id': new Types.ObjectId(_id)
            }
         },
         {
            '$lookup': {
               'from': 'employees',
               'localField': 'headEmpId',
               'foreignField': '_id',
               'as': 'headEmpDetails',
               'pipeline': [
                  {
                     '$project': {
                        "fullName": 1,
                        "type": 1,
                        "designation": 1,
                        "branchId": 1,
                     }
                  }
               ]
            }
         },
         {
            '$unwind': {
               'path': '$headEmpDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            '$lookup': {
               'from': 'employees',
               'localField': 'managerId',
               'foreignField': '_id',
               'as': 'managerDetails',
               'pipeline': [
                  {
                     '$project': {
                        "fullName": 1,
                        "type": 1,
                        "designation": 1,
                        "branchId": 1,
                     }
                  }
               ]
            }
         },
         {
            '$unwind': {
               'path': '$managerDetails',
               'preserveNullAndEmptyArrays': true
            }
         },
         {
            '$project': {
               'password': 0,
               "updatedAt": 0,
               "__v": 0
            }
         },
         {
            '$lookup': {
               'from': 'empdocs',
               'localField': '_id',
               'foreignField': 'employeeId',
               'as': 'docs',
               'pipeline': [
                  {
                     '$project': {
                        "type:": 0,
                        "format": 0,
                        'date': 0,
                        'isActive': 0,
                        'employeeId': 0,
                        'isPrivate': 0,
                        'createdAt': 0,
                        'updatedAt': 0,
                        "__v": 0,
                     }
                  }
               ]
            }
         }
      ]

      const data = await Employee.aggregate(pipeline)
      if (!data?.[0]) {
         return res.status(400).json({ success: false, message: "Employee account not found" })
      }

      return res.status(200).json({ success: true, data: data?.[0] })

   } catch (error) {
      console.log("adminEmployeeProfile in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminUpdateEmployeeAccount = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req.query
      const { docs } = req.body
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const updateKeys = ["fullName", "type", "branchId", "designation", "bankName", "bankBranchName", "bankAccountNo", "panNo", "address",
         "profileImg", "dob", "gender", "district", "city", "state", "pinCode", "headEmpId", "managerId"
      ]

      const isExist = await Employee.findOne({ _id })
      if (!isExist) {
         return res.status(400).json({ success: false, message: "Employee not found" })
      }

      updateKeys?.forEach(ele => {
         if (req.body[ele]) {
            isExist[ele] = req.body[ele]
         }
      })

      const docList = docs?.filter(ele => Boolean(ele?._id))?.map(ele => ele?._id)
      await EmpDoc.deleteMany({ employeeId: isExist?._id?.toString(), _id: { $nin: docList } })

      const newDoc = docs?.filter(doc => doc?.new) || []
      let selectedDocs = newDoc?.map(doc => {
         return {
            name: doc?.docName,
            type: doc?.docType,
            format: doc?.docFormat,
            url: doc?.docURL,
            employeeId: isExist?._id,
            isPrivate: doc?.isPrivate || false,
         }
      })

      selectedDocs?.length && await EmpDoc.insertMany(selectedDocs)
      await isExist.save()
      return res.status(200).json({ success: true, message: "Successfully update Employee" });
   } catch (error) {
      console.log("updateEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminDeleteEmployeeAccount = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req.query

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const employee = await Employee.findById(_id)
      if (!employee) return res.status(401).json({ success: false, message: "Employee not found" })
      const deletedEmployee = await Employee.findByIdAndDelete(_id)
      return res.status(200).json({ success: true, message: "Successfully remove Employee" });

   } catch (error) {
      console.log("updateEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewAllEmployee = async (req, res) => {
   try {
      const { admin } = req
      let { limit = 10, search = "", pageNo = 1, type = "", empType = "" } = req.query
      pageNo = (pageNo - 1) * limit;
      type = type || true;
      empType = empType || false

      let matchQuery = []

      const pipeline = [
         {
            "$match": {
               "isActive": req?.query?.type == "true" ? true : false,
               ...(empType ? { "type": { "$regex": empType, "$options": "i" } } : {}),
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
               "empId": 1,
               "mobileNo": 1,
               "type": 1,
               "designation": 1,
               "branchId": 1,
               "referEmpId": 1,
               "createdAt": 1,
               "managerId": 1,
               "headEmpId": 1
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

      return res.status(200).json({ success: true, message: "get sale employee data", data: result?.[0]?.data || [], noOfEmployee: result?.[0]?.totalCount?.[0]?.count || 0 });
   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminDownloadAllEmployee = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req.query.type ? req.query.type : true;
      const empType = req.query?.empType ? req.query?.empType : false

      const query = getAllEmployeeSearchQuery(searchQuery, type, empType)
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

export const adminGetSaleEmployee = async (req, res) => {
   try {
      const { admin } = req

      let { limit, search, pageNo } = req.query
      const pageItemLimit = limit || 50;
      pageNo = pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = search || "";

      const pipeline = [
         {
            $match: {
               isActive: true,
               type: { $regex: "sales", $options: "i", },
               $or: [
                  { fullName: { $regex: searchQuery, $options: "i", }, },
                  { email: { $regex: searchQuery, $options: "i", }, },
                  { mobileNo: { $regex: searchQuery, $options: "i", }, },
                  { type: { $regex: searchQuery, $options: "i", }, },
                  { designation: { $regex: searchQuery, $options: "i", }, },
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
                  { $sort: { createdAt: -1, }, },
                  { $skip: 0, },
                  { $limit: 10, },
               ],
               totalCount: [
                  { $count: "count", },
               ],
            },
         },
      ]
      const result = await Employee.aggregate(pipeline)
      return res.status(200).json({ success: true, message: "get sale employee data", data: result?.[0]?.data || [], noOfEmployee: result?.[0]?.totalCount?.[0]?.count || 0 });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminGetNormalEmployee = async (req, res) => {
   try {
      const { admin } = req
      let { limit = 10, pageNo = 1, search = "", isAddEmp = "" } = req.query
      pageNo = (pageNo - 1) * limit;

      let excludedTypes = ["Sales", "Operation", "Finance", "Sathi Team", "Branch"];
      if (isAddEmp == "true") {
         excludedTypes = ["Operation", "Finance"]
      }
      let query = {
         $and: [
            { isActive: true },
            { type: { $nin: excludedTypes } },
            {
               $or: [
                  { fullName: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
                  { mobileNo: { $regex: search, $options: "i" } },
                  { type: { $regex: search, $options: "i" } },
                  { designation: { $regex: search, $options: "i" } },

               ]
            }
         ]
      };
      const pipeline = [
         {
            "$match": {
               "$and": [
                  { "isActive": true },
                  { "type": { "$nin": excludedTypes } },
                  {
                     "$or": [
                        { "fullName": { "$regex": search, "$options": "i" } },
                        { "email": { "$regex": search, "$options": "i" } },
                        { "mobileNo": { "$regex": search, "$options": "i" } },
                        { "type": { "$regex": search, "$options": "i" } },
                        { "designation": { "$regex": search, "$options": "i" } },
                        { "branchId": { "$regex": search, "$options": "i" } },
                     ]
                  }
               ]
            }

         },
         {
            "$project": {
               "fullName": 1,
               "email": 1,
               "mobileNo": 1,
               "type": 1,
               "designation": 1,
               "branchId": 1,
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
      // const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      // const noOfEmployee = await Employee.find(query).count()
      // return res.status(200).json({ success: true, message: "get normal employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });
      return res.status(200).json({ success: true, message: "get sale employee data", data: result?.[0]?.data || [], noOfEmployee: result?.[0]?.totalCount?.[0]?.count || 0 });
   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const changeStatusAdminCase = async (req, res) => {
   try {
      const { admin } = req
      const { error } = validateUpdateAdminCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const {mailMethod="",nextFollowUp=""} = req.body

      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const statusRemark = req.body.remark
      const caseStatus = req.body.status

      const updateCase = await Case.findById(req.body._id).populate("partnerObjId", "profile.consultantName profile.primaryEmail").populate("clientObjId", "profile.consultantName profile.primaryEmail")
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      updateCase.currentStatus = req.body.status
      updateCase.nextFollowUp = nextFollowUp || null
      updateCase.lastStatusDate = new Date()
      await updateCase.save()

      const addNewStatus = new CaseStatus({
         remark: statusRemark,
         status: caseStatus,
         consultant: admin?.fullName,
         adminId: req?.user?._id,
         caseId: req.body._id
      })
      await addNewStatus.save()

      // send notification through email and db notification
      const caseNumber = updateCase.fileNo
      const notificationEmpUrl = `/employee/view case/${updateCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${updateCase?._id?.toString()}`

      sendNotificationAndMail(
         updateCase?._id?.toString(),
         `Case file No. ${updateCase?.fileNo} status mark as ${req.body.status}`,
         updateCase?.branchId || "",
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )

      const subject = "Update on Your Case – Status Changed"
      // client
      if (updateCase?.clientObjId?.profile?.primaryEmail && (["client","both"]?.includes(mailMethod?.toLowerCase()))) {
         sendMail({
            to: updateCase?.clientObjId?.profile?.primaryEmail,
            subject,
            html: caseUpdateStatusTemplate({ type: "Client", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/client/view case/${req.body._id}` })
         })
      }
      // partner
      if (updateCase?.partnerObjId?.profile?.primaryEmail && (["partner","both"]?.includes(mailMethod?.toLowerCase()))) {
         sendMail({
            to: updateCase?.partnerObjId?.profile?.primaryEmail,
            subject,
            html: caseUpdateStatusTemplate({ type: "Partner", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/partner/view case/${req.body._id}` })
         })
      }
      return res.status(200).json({ success: true, message: `Case status change to ${req.body.status}` });
   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const adminEditCaseStatus = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { error } = validateEditAdminCaseStatus(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (!validMongooseId(req.body.caseId) || !validMongooseId(req.body.processId)) return res.status(400).json({ success: false, message: "Not a valid processId or caseId" })

      const updateCase = await Case.findByIdAndUpdate(req.body.caseId, {
         $set: {
            ...(req.body.isCurrentStatus ? { currentStatus: req.body.status } : {}),
         }
      },
         { new: true },)
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      const updateStatus = await CaseStatus.findByIdAndUpdate(req.body?.processId, {
         $set: {
            status: req.body.status,
            remark: req.body.remark,
            consultant: admin?.fullName,
            adminId: req?.user?._id
         }
      })

      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${updateCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${updateCase?._id?.toString()}`

      sendNotificationAndMail(
         updateCase?._id?.toString(),
         `Case file No. ${updateCase?.fileNo} status update`,
         updateCase?.branchId || "",
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )
      return res.status(200).json({ success: true, message: "Successfully update case process" });
   } catch (error) {
      console.log("updateAdminCaseProcess in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

// old version
// export const viewAllAdminCase = async (req, res) => {
//    try {
//       const {admin} = req

//       const pageItemLimit = req.query.limit ? req.query.limit : 10;
//       const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
//       const searchQuery = req.query.search ? req.query.search : "";
//       const statusType = req.query.status ? req.query.status : "";
//       const startDate = req.query.startDate ? req.query.startDate : "";
//       const endDate = req.query.endDate ? req.query.endDate : "";
//       const type = req?.query?.type ? req.query.type : true
//       const isReject = req?.query?.isReject=="true" ? {$in:["Reject"]} : {$nin:["Reject"]}

//       const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type,false,false,isReject)
//       // if (!query.success) return res.status(400).json({ success: false, message: query.message })
//       // console.log("query", query?.query);

//       const matchQuery = []


//       if (startDate && endDate) {
//          const validStartDate = getValidateDate(startDate)
//          if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
//             const validEndDate = getValidateDate(endDate)
//          if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
//       }

//       if (startDate && endDate) {
//          const start = new Date(startDate).setHours(0, 0, 0, 0);
//          const end = new Date(endDate).setHours(23, 59, 59, 999);

//          matchQuery.push({
//            createdAt: {
//              $gte: new Date(start),
//              $lte: new Date(end)
//            }
//          });
//       }

//       const pipeline = [
//          {
//            $match: {
//              $and: [
//                { isPartnerReferenceCase: false },
//                { isEmpSaleReferenceCase: false },
//                { currentStatus: { $regex: statusType, $options: "i" } },
//                { isActive: Boolean(req.query.type == "true" ? true :false) },
//                req?.query?.isReject=="true" ? {currentStatus:{$in:["Reject"]}} : {currentStatus:{$nin:["Reject"]}},
//                ...matchQuery,
//              ]
//            }
//          },
//          {
//             $addFields: {
//               validPartnerIdString: {
//                 $cond: {
//                   if: {
//                     $and: [
//                       { $eq: [{ $type: "$partnerId" }, "string"] }, // Ensure partnerId is of type string
//                       { $ne: ["$partnerId", ""] }, // Ensure partnerId is not an empty string
//                       { $eq: [{ $strLenCP: "$partnerId" }, 24] } // Ensure it has exactly 24 characters
//                     ]
//                   },
//                   then: "$partnerId",
//                   else: null
//                 }
//               }
//             }
//           },
//           {
//             $lookup: {
//               from: 'partners',
//               let: { partnerIdString: "$validPartnerIdString" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         { $ne: ["$$partnerIdString", null] }, // Ensure partnerIdString is not null
//                         { $ne: ["$$partnerIdString", ""] }, // Ensure partnerIdString is not an empty string
//                         { 
//                           $eq: [
//                             "$_id",
//                             { $toObjectId: "$$partnerIdString" }
//                           ]
//                         }
//                       ]
//                     }
//                   }
//                 },
//                 {
//                   $project: {
//                     fullName: 1 // Include only the fullName field
//                   }}
//               ],
//               as: 'partnerDetails'
//             }
//           },
//           {'$unwind':{
//             'path':'$partnerDetails',
//             'preserveNullAndEmptyArrays':true
//           }},
//           {
//             $addFields: {
//               validSaleEmpIdString: {
//                 $cond: {
//                   if: {
//                     $and: [
//                       { $eq: [{ $type: "$empSaleId" }, "string"] }, // Ensure partnerId is of type string
//                       { $ne: ["$empSaleId", ""] }, // Ensure partnerId is not an empty string
//                       { $eq: [{ $strLenCP: "$empSaleId" }, 24] } // Ensure it has exactly 24 characters
//                     ]
//                   },
//                   then: "$empSaleId",
//                   else: null
//                 }
//               }
//             }
//           },
//           {
//             $lookup: {
//               from: 'employees',
//               let: { saleEmpIdString: "$validSaleEmpIdString" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         { $ne: ["$$saleEmpIdString", null] }, // Ensure partnerIdString is not null
//                         { $ne: ["$$saleEmpIdString", ""] }, // Ensure partnerIdString is not an empty string
//                         { 
//                           $eq: [
//                             "$_id",
//                             { $toObjectId: "$$saleEmpIdString" }
//                           ]
//                         }
//                       ]
//                     }
//                   }
//                 },
//                 {
//                   $project: {
//                     fullName: 1, // Include only the fullName field
//                     designation:1,
//                     type:1
//                   }}
//               ],
//               as: 'employeeDetails'
//             }
//           },
//           {'$unwind':{
//             'path':'$employeeDetails',
//             'preserveNullAndEmptyArrays':true
//           }},
//           {'$match':{
//                '$or': [
//                  { name: { $regex: searchQuery, $options: "i" } },
//                  { 'partnerDetails.fullName': { $regex: searchQuery, $options: "i" } },
//                  { 'employeeDetails.fullName': { $regex: searchQuery, $options: "i" } },
//                  { consultantCode: { $regex: searchQuery, $options: "i" } },
//                  { fileNo: { $regex: searchQuery, $options: "i" } },
//                  { email: { $regex: searchQuery, $options: "i" } },
//                  { mobileNo: { $regex: searchQuery, $options: "i" } },
//                  { policyType: { $regex: searchQuery, $options: "i" } },
//                  { caseFrom: { $regex: searchQuery, $options: "i" } },
//                  { branchId: { $regex: searchQuery, $options: "i" } },
//                ]          
//           }},
//           {'$sort':{'createdAt':-1}},
//          {
//            $facet: {
//              cases: [
//                { $sort: { createdAt: -1 } },
//                { $skip: Number(pageNo) },
//                { $limit: Number(pageItemLimit) },
//                { 
//                  $project: {
//                    caseDocs: 0,
//                    processSteps: 0,
//                    addEmployee: 0,
//                    caseCommit: 0,
//                    partnerReferenceCaseDetails: 0
//                  }
//                }
//              ],
//              totalCount: [
//                { $count: "count" }
//              ],
//              totalAmt: [
//                {
//                  $group: {
//                    _id: null,
//                    totalAmtSum: { $sum: "$claimAmount" }
//                  }
//                }
//              ]
//            }
//          }
//        ];

//        const result = await Case.aggregate(pipeline);
//        const getAllCase = result[0].cases;
//        const noOfCase = result[0].totalCount[0]?.count || 0;
//        const totalAmount = result?.[0]?.totalAmt

//       return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount });

//    } catch (error) {
//       console.log("updateAdminCase in error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// }

// new version
export const viewAllAdminCase = async (req, res) => {
   try {
      const { admin } = req
      let { limit = 10, pageNo = 1, search = "", status = "", startDate = "", endDate = "", empId = "", type, isReject = "", isWeeklyFollowUp = false, isClosed = false } = req.query
      const skip = (pageNo - 1) * limit;

      let matchQuery = []
      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }


      matchQuery.push({ isActive: type == "true" ? true : false })
      matchQuery.push(isReject == "true" ? { currentStatus: { $in: ["Reject"] } } : { currentStatus: { $nin: ["Reject"] } })
      isClosed == "true" && matchQuery.push({ currentStatus: { $in: ["Closed"] } })
      isWeeklyFollowUp == "true" && matchQuery.push({ currentStatus: { $nin: ["Closed", "Reject"] } })

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
                "nextFollowUp":1,
               "lastStatusDate":1
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
                        "profile.consultantName": 1,
                        "profile.consultantCode": 1,
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
                        "profile.consultantName": 1,
                        "profile.consultantCode": 1,
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
         ...(isWeeklyFollowUp == "true" ? [
            {
               $match: {
                  nextFollowUp: {
                     $ne: null,
                     $lte: new Date()
                  }
               }
            }
            // {
            //    $lookup: {
            //       from: "casestatuses",
            //       let: { id: "$_id" },
            //       pipeline: [
            //          {
            //             $match: {
            //                $expr: {
            //                   $and: [
            //                      { $eq: ["$isActive", true] },
            //                      {
            //                         $or: [
            //                            { $eq: ["$caseId", "$$id"] },
            //                            { $eq: ["$caseMargeId", { "$toString": "$$id" }] }
            //                         ]
            //                      }
            //                   ]
            //                }
            //             }
            //          },
            //          { $project: { caseId: 1, caseMargeId: 1, createdAt: 1, status: 1 } },
            //          { $sort: { createdAt: -1 } }, // newest first
            //          { $limit: 1 } // get only last update
            //       ],
            //       as: "lastStatus"
            //    }
            // },
            // {
            //    $addFields: {
            //       lastUpdateDate: {
            //          $ifNull: [
            //             { $arrayElemAt: ["$lastStatus.createdAt", 0] },
            //             null
            //          ]
            //       }
            //    }
            // },
            // {
            //    $addFields: {
            //       daysSinceUpdate: {
            //          $cond: [
            //             { $not: ["$lastUpdateDate"] },   // if no status
            //             9999,                              // treat as very old
            //             {
            //                $dateDiff: {
            //                   startDate: "$lastUpdateDate",
            //                   endDate: "$$NOW",
            //                   unit: "day"
            //                }
            //             }
            //          ]
            //       }
            //    }
            // },
            // {
            //    $match: {
            //       daysSinceUpdate: { $gte: 7 }
            //    }
            // }
         ] : []),
         { '$sort': { 'createdAt': -1 } },
         {
            "$facet": {
               "cases": [
                  { "$skip": Number(skip) },
                  { "$limit": Number(limit) },
               ],
               "totalCount": [
                  { "$count": "count" }
               ],
               "totalAmt": [
                  {
                     "$group": {
                        "_id": null,
                        "totalAmtSum": { "$sum": "$claimAmount" }
                     }
                  }
               ]
            }
         }
      ];

      const result = await Case.aggregate(pipeline);
      const getAllCase = result[0].cases;
      const noOfCase = result[0].totalCount[0]?.count || 0;
      const totalAmount = result?.[0]?.totalAmt
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const adminViewPartnerReport = async (req, res) => {
   try {
      const { admin } = req
      if (!validMongooseId(req.query.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
      const partner = await Partner.findById(req.query.partnerId).select("-password")
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
                        caseDocs: 0,
                        processSteps: 0,
                        addEmployee: 0,
                        caseCommit: 0,
                        partnerReferenceCaseDetails: 0
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



      // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      // const noOfCase = await Case.find(query?.query).count()
      // const aggregateResult = await Case.aggregate(aggregationPipeline);
      // console.log("aggregateResult",aggregateResult);
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount, user: partner });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewEmpSaleReport = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true


      const caseAccess = ["operation", "finance", "branch"]
      const excludedTypes = ["sales", "operation", "finance", "sathi team", "branch"];
      const isNormalEmp = !excludedTypes.includes(empSale?.type?.toLowerCase())
      let empBranchId = false
      let branchWise = false
      // if (caseAccess?.includes(empSale?.type?.toLowerCase()) || isNormalEmp) {
      //    empBranchId = empSale?.branchId
      //    branchWise = true
      //    const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, isNormalEmp && empSale?._id?.toString(), true, false, !isNormalEmp && empSale?.branchId)
      //    if (!query.success) return res.status(400).json({ success: false, message: query.message })
      //    const aggregationPipeline = [
      //          { $match: query?.query }, // Match the documents based on the query
      //          {
      //             $group: {
      //                _id: null,
      //                totalAmtSum: { $sum: "$claimAmount" }
      //             }
      //          }
      //       ];

      //    const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
      //    const noOfCase = await Case.find(query?.query).count()
      //    const aggregateResult = await Case.aggregate(aggregationPipeline);
      //    return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: aggregateResult, user: empSale });

      // } else {
      //    let extactMatchQuery = [
      //       { referEmpId: empSale?._id },
      //       { _id: empSale?._id }
      //    ]

      //    if((empSale?.type?.toLowerCase()=="sales" && empSale?.designation?.toLowerCase()=="manager")){
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
      //          { branchId: { $regex: empSale?.branchId, $options: "i" } },
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
      //    const getAllCase = await Case.find(query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
      //    const noOfCase = await Case.find(query).count()
      //    const aggregationPipeline = [
      //       { $match: query }, // Match the documents based on the query
      //       {
      //          $group: {
      //             _id: null,
      //             totalAmtSum: { $sum: "$claimAmount" }
      //          }
      //       }
      //    ];
      //    const aggregateResult = await Case.aggregate(aggregationPipeline);
      //    return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: aggregateResult, user: empSale });

      // }

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

      if (caseAccess?.includes(empSale?.type?.toLowerCase()) || isNormalEmp) {
         // const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, isNormalEmp && empId, true, false,!isNormalEmp && empBranchId)
         // if (!query.success) return res.status(400).json({ success: false, message: query.message })

         // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
         // const noOfCase = await Case.find(query?.query).count()
         // return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });

         if (isNormalEmp && empSale?._id) {
            matchQuery.push({ addEmployee: { $in: [empSale?._id?.toString()] } })
         }

      } else {

         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if (empSale?.type?.toLowerCase() == "sales" && empSale?.designation?.toLowerCase() == "manager") {
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

      // console.log("matchQuery",matchQuery);


      const pipeline = [
         {
            $match: {
               $and: [
                  { isPartnerReferenceCase: false },
                  { isEmpSaleReferenceCase: false },
                  { currentStatus: { $regex: statusType, $options: "i" } },
                  { isActive: true },
                  { branchId: { $regex: empSale?.branchId, $options: "i" } },
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
         {
            $facet: {
               cases: [
                  { $sort: { createdAt: -1 } },
                  { $skip: Number(pageNo) },
                  { $limit: Number(pageItemLimit) },
                  {
                     $project: {
                        caseDocs: 0,
                        processSteps: 0,
                        addEmployee: 0,
                        caseCommit: 0,
                        partnerReferenceCaseDetails: 0
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
                        totalAmtSum: { $sum: "$claimAmount" }
                     }
                  }
               ]
            }
         }
      ];

      const result = await Case.aggregate(pipeline);
      //  console.log("result",result?.[0]?.totalAmtSum);

      const getAllCase = result[0].cases;
      const noOfCase = result[0].totalCount[0]?.count || 0;
      const totalAmount = result?.[0]?.totalAmt
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewEmpSalePartnerReport = async (req, res) => {
   try {
      const { admin } = req
      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })


      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const caseAccess = ["operation", "finance", "branch"]

      if (caseAccess?.includes(empSale?.type?.toLowerCase())) {
         const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate, empSale?.branchId)
         if (!query.success) return res.status(400).json({ success: false, message: query?.message })
         const getAllPartner = await Partner.find(query?.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId", "fullName type designation");
         const noOfPartner = await Partner.find(query?.query).count()
         return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });

      } else {
         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if ((empSale?.type?.toLowerCase() == "sales" && empSale?.designation?.toLowerCase() == "manager")) {
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

         console.log("extractType----", extractType);

         let query = {
            $and: [
               { isActive: true },
               { branchId: { $regex: empSale?.branchId, $options: "i" } },
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
         const getAllPartner = await Partner.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId", "fullName type designation");
         const noOfPartner = await Partner.find(query).count()
         return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });
      }


   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const viewCaseByIdByAdmin = async (req, res) => {
   try {
      const { _id } = req.query;

      if (!validMongooseId(_id)) {
         return res.status(400).json({ success: false, message: "Invalid case id" });
      }

      const [caseData] = await Case.aggregate([
         { $match: { _id: new mongoose.Types.ObjectId(_id) } },
         {
            $lookup: {
               from: "clients",
               localField: "clientObjId",
               foreignField: "_id",
               as: "clientDetails",
               pipeline: [
                  { $project: { "profile.consultantCode": 1, "profile.consultantName": 1 } }
               ]
            }
         },
         {
            $unwind: {
               path: "$clientDetails",
               preserveNullAndEmptyArrays: true
            }
         },
         {
            $lookup: {
               from: "partners",
               localField: "partnerObjId",
               foreignField: "_id",
               as: "partnerDetails",
               pipeline: [
                  { $project: { "profile.consultantCode": 1, "profile.consultantName": 1 } }
               ]
            }
         },
         {
            $unwind: {
               path: "$partnerDetails",
               preserveNullAndEmptyArrays: true
            }
         },
         {
            $lookup: {
               from: "employees",
               localField: "empObjId",
               foreignField: "_id",
               as: "empDetails",
               pipeline: [
                  {
                     $project: {
                        fullName: 1,
                        type: 1,
                        designation: 1
                     }
                  }
               ]
            }
         },
         { $unwind: { path: "$empDetails", preserveNullAndEmptyArrays: true } },
         {
            $lookup: {
               from: "casedocs",
               let: { caseId: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $or: [{ $eq: ["$caseId", "$$caseId"] }, { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }] }
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
               let: { caseId: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $or: [{ $eq: ["$caseId", "$$caseId"] }, { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }] }
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
               let: { caseId: "$_id" },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              { $or: [{ $eq: ["$caseId", "$$caseId"] }, { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }] }
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
               let: { caseId: "$_id" },
               pipeline: [
                  { $match: { $expr: { $and: [{ $eq: ["$isActive", true] }, { $eq: ["$caseId", "$$caseId"] }] } } }
               ],
               as: "casePayment"
            }
         },
         {
            $project: {
               addEmployee: 0
            }
         },
         {
            $lookup: {
               from: "case_forms",
               localField: "_id",
               foreignField: "caseId",
               pipeline: [
                  { $match: { isActive: true } },
                  { $project: { formType: 1, caseId: 1 } },
               ],
               as: "case_forms"
            }
         },
         {
            $lookup: {
               from: "cases",
               let: {
                  clientId: "$clientObjId",
                  caseId: "$_id",
                  branchId: "$branchId"
               },
               as: "clientOtherCases",
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $cond: {
                              if: {
                                 $or: [
                                    { $eq: ["$$clientId", null] },
                                    { $not: ["$$clientId"] }
                                 ]
                              },
                              then: false,
                              else: {
                                 $and: [
                                    { $eq: ["$clientObjId", "$$clientId"] },
                                    { $eq: ["$branchId", "$$branchId"] },
                                    { $ne: ["$_id", "$$caseId"] }
                                 ]
                              }
                           }
                        }
                     }
                  },
                  {
                     $project: {
                        name: 1,
                        currentStatus: 1,
                        policyNo: 1,
                        fileNo: 1,
                        createdAt: 1,
                        clientObjId: 1
                     }
                  }
               ]
            }
         },

      ]);

      if (!caseData) {
         return res.status(404).json({ success: false, message: "Case not found" });
      }

      return res.status(200).json({
         success: true,
         message: "Case data fetched successfully",
         data: caseData
      });

   } catch (error) {
      console.error("viewCaseByIdByAdmin error:", error);
      return res.status(500).json({
         success: false,
         message: "Internal server error",
         error: error.message
      });
   }
};


export const adminAddCaseFile = async (req, res) => {
   try {
      await dbFunction.commonAddCaseFile(req, res, "adminId")
   } catch (error) {
      console.log("add case file in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

// old version
// export const viewAllPartnerByAdmin = async (req, res) => {
//    try {
//       const {admin} = req
//       const pageItemLimit = req.query.limit ? req.query.limit : 10;
//       const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
//       const searchQuery = req.query.search ? req.query.search : "";
//       const type = req?.query?.type ? req.query.type : true;
//       const startDate = req.query.startDate ? req.query.startDate : "";
//       const endDate = req.query.endDate ? req.query.endDate : "";

//       const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate)
//       if (!query.success) return res.status(400).json({ success: false, message: query.message })
//       const getAllPartner = await Partner.find(query.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId","fullName type designation");
//       const noOfPartner = await Partner.find(query.query).count()
//       return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });

//    } catch (error) {
//       console.log("viewAllPartnerByAdmin in error:", error);
//       res.status(500).json({ success: false, message: "Internal server error", error: error });

//    }
// }

export const viewAllPartnerByAdmin = async (req, res) => {
   try {
      const { admin } = req
      const result = await getAllPartnerResult(req, null)
      if (result?.status == 200) {
         return res.status(200).json({ success: true, message: result?.message, data: result?.data, noOfPartner: result?.noOfPartner });
      } else if (result?.message) {
         return res.status(result.status).json({ success: false, message: result?.message });
      } else {
         return res.status(500).json({ success: false, message: "Something went wrong" });
      }
   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const viewPartnerByIdByAdmin = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getPartner = await Partner.findById(_id).select("-password")
      if (!getPartner) return res.status(404).json({ success: false, message: "Partner not found" })
      return res.status(200).json({ success: true, message: "get partner by id data", data: getPartner });

   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const adminEditClient = async (req, res, next) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



      const { _id } = req.query;
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
            "profile.primaryMobileNo": req.body?.mobileNo,
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
            "profile.kycPan": req?.body?.kycPan
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

export const adminUpdateParnterProfile = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req.query;
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

export const adminUpdatePartnerBankingDetails = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req.query;
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




export const adminSetIsActivePartner = async (req, res) => {
   try {
      const { admin } = req

      const { _id, status } = req.query
      if (!_id || !status) return res.status(400).json({ success: false, message: "required partner id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updatePartner = await Partner.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updatePartner) return res.status(404).json({ success: false, message: "Partner not found" })
      return res.status(200).json({ success: true, message: `Now partner ${updatePartner?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActivePartner in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminSetPartnerTag = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, profileTag } = req.body
      if (!_id || !profileTag) return res.status(400).json({ success: false, message: "required partner id and profileTag" })
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updatePartner = await Partner.findByIdAndUpdate(_id, { $set: { profileTag: profileTag } }, { new: true })
      if (!updatePartner) return res.status(404).json({ success: false, message: "Partner not found" })
      return res.status(200).json({ success: true, message: "Successfully update partner tag" });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}

export const adminSetClientTag = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, profileTag } = req.body
      if (!_id || !profileTag) return res.status(400).json({ success: false, message: "required client id and profileTag" })
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updateClient = await Client.findByIdAndUpdate(_id, { $set: { profileTag: profileTag } }, { new: true })
      if (!updateClient) return res.status(404).json({ success: false, message: "Client not found" })
      return res.status(200).json({ success: true, message: "Successfully update client tag" });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}


// for client
export const adminViewAllClient = async (req, res) => {
   try {
      const result = await getAllClientResult(req)
      if (result?.status == 1) {
         return res.status(200).json({ success: true, message: "get client data", data: result?.data, noOfClient: result?.noOfClient });
      } else {
         return res.status(400).json({ success: false, message: "Something went wrong" });
      }
   } catch (error) {
      console.log("adminViewAllClient in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewClientById = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getClient = await Client.findById(_id).select("-password")
      if (!getClient) return res.status(404).json({ success: false, message: "Client not found" })
      return res.status(200).json({ success: true, message: "get client by id data", data: getClient });

   } catch (error) {
      console.log("adminViewClientById in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminUpdateCaseById = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const mycase = await Case.find({ _id: _id })
      if (mycase.length == 0) return res.status(404).json({ success: false, message: "Case not found" })

      const { error } = validateAddClientCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })


      const newDoc = req?.body?.caseDocs?.filter(doc => doc?.new)

      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body, caseDocs: [] } }, { new: true })

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
         `Update on Case file No. ${updateCase?.fileNo}`,
         updateCase?.branchId || "",
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )
      return res.status(200).json({ success: true, message: "Successfully update case", data: updateCase });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminAddOrUpdatePayment = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Client account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

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
      const notificationEmpUrl = `/employee/view case/${findCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${findCase?._id?.toString()}`

      sendNotificationAndMail(
         findCase?._id?.toString(),
         `Payment details update on Case file No. ${findCase?.fileNo}`,
         findCase?.branchId || "",
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )
      return res.status(200).json({ success: true, message: "Success" });
   } catch (error) {
      console.log("AdminAddCaseCommit in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminSetIsActiveClient = async (req, res) => {
   try {
      const { admin } = req

      const { _id, status } = req.query
      if (!_id || !status) return res.status(400).json({ success: false, message: "required client id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updateClient = await Client.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateClient) return res.status(404).json({ success: false, message: "Client not found" })
      return res.status(200).json({ success: true, message: `Now client ${updateClient?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveClient in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


// for case




export const adminAddCaseFeeClient = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id } = req.query
      if (!_id) return res.status(400).json({ success: false, message: "required case id" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { error } = validateAdminAddCaseFee(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      req.body.mode = ""
      req.body.collectBy = ""
      req.body.onDate = ""
      req.body.orderId = ""
      req.body.referenceId = ""
      req.body.verify = "false"
      req.body.completed = false
      const updateCase = await Case.findByIdAndUpdate(_id, { $push: { paymentDetails: req.body } }, { new: true })
      if (!updateCase) return res.status(401).json({ success: false, message: "Case not found" })


      return res.status(200).json({ success: true, message: "Successfully Add payment" });
   } catch (error) {
      console.log("adminSetCaseFee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminUpdateClientCaseFee = async (req, res) => {
   try {
      const { admin } = req

      const { error } = validateAdminUpdateCasePayment(req.query)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (!validMongooseId(req.query._id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      if (!validMongooseId(req.query.paymentId)) return res.status(400).json({ success: false, message: "Not a valid paymentId" })


      const updateCase = await Case.findOneAndUpdate({ _id: req.query._id, "paymentDetails._id": req.query.paymentId },
         {
            $set: {
               "paymentDetails.$.mode": req.query.paymentMode,
               "paymentDetails.$.collectBy": req?.user?.fullName,
               "paymentDetails.$.onDate": new Date(),
               "paymentDetails.$.completed": true,

            }
         }, { new: true })
      if (!updateCase) return res.status(401).json({ success: false, message: "Admin account not found" })


      return res.status(200).json({ success: true, message: "Successfully update case payment" });
   } catch (error) {
      console.log("adminSetCaseFee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

// old version
// export const adminShareCaseToEmployee = async (req, res) => {
//    try {
//       const {admin} = req      
//       const { error } = validateAdminAddEmployeeToCase(req.body)
//       if (error) return res.status(400).json({ success: false, message: error.details[0].message })

//       const updateCase = req.body?.shareCase?.map(caseShare => Case.findByIdAndUpdate(caseShare, { $push: { addEmployee: { $each: req?.body?.shareEmployee } } }, { new: true }))
//       console.log("updateCase", updateCase);
//       const allUpdateCase = await Promise.all(updateCase)
//       return res.status(200).json({ success: true, message: "Successfully employee add to case" });
//    } catch (error) {
//       console.log("adminSetCaseFee in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }

// new version
export const adminShareCaseToEmployee = async (req, res) => {
   try {
      const { admin } = req
      const { error } = validateAdminAddEmployeeToCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const { shareCase = [], shareEmployee = [] } = req.body
      let bulkOps = []
      for (const toEmployeeId of shareEmployee) {
         const exists = await ShareSection.find({ toEmployeeId, caseId: { $in: shareCase } }, { caseId: 1 })
         let filter = shareClients?.filter(caseId => !exists?.map(ele => ele?.caseId?.toString())?.includes(caseId))
         filter?.forEach(caseId => {
            bulkOps.push({
               insertOne: {
                  document: {
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


// old version
// export const adminSharePartnerToSaleEmp = async (req, res) => {
//    try {
//       const {admin} = req

//       const { error } = validateAdminSharePartner(req.body)
//       if (error) return res.status(400).json({ success: false, message: error.details[0].message })

//       const updatePartners = req.body?.sharePartners?.map(async(casePartners) =>{
//          const getPartner = await Partner.findById(casePartners)
//          if(getPartner){
//             const filterShareEmp =  req.body.shareEmployee.filter(empId => !getPartner?.shareEmployee?.includes(empId));
//             return Partner.findByIdAndUpdate(casePartners, { $push: { shareEmployee: { $each: filterShareEmp } } }, { new: true })
//          }
//       }


//          )
//       console.log("updatePartners", updatePartners);
//       try {
//          const allUpdatePartner = await Promise.all(updatePartners)
//          return res.status(200).json({ success: true, message: "Successfully share partner" });
//       } catch (error) {
//          return res.status(400).json({ success: false, message: "Failed to share" })
//       }

//    } catch (error) {
//       console.log("adminSetCaseFee in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }

export const adminSharePartnerToSaleEmp = async (req, res) => {
   try {
      const { admin } = req

      const { error } = validateAdminSharePartner(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      const { sharePartners = [], shareEmployee = [] } = req.body

      if (!shareEmployee[0]) return res.status(400).json({ success: true, message: "Please add employee to share" });

      await ShareSection.deleteMany({ toEmployeeId: { $exists: true }, partnerId: { $in: sharePartners }, clientId: { $exists: false }, caseId: { $exists: false } })
      await Partner.updateMany({ _id: { $in: sharePartners } }, { $set: { salesId: shareEmployee[0] } })

      return res.status(200).json({ success: true, message: "Successfully share partner" });

   } catch (error) {
      console.log("empOp share partner in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminRemovePartnerToSaleEmp = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req?.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid SaleId" })

      const getEmployee = await Employee.findById(_id)
      if (!getEmployee) return res.status(404).json({ success: false, message: "Employee Not found" })

      const { error } = validateAdminRemovePartner(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const updatePartners = req.body?.removePartners?.map(removePartner => Partner.findByIdAndUpdate(removePartner, { $pull: { shareEmployee: _id } }, { new: true }))
      try {
         const allUpdatePartner = await Promise.all(updatePartners)
         console.log("updatePartners", allUpdatePartner);
         return res.status(200).json({ success: true, message: "Successfully remove partner" });
      } catch (error) {
         return res.status(400).json({ success: false, message: "Failed to remove" })
      }

   } catch (error) {
      console.log("adminSetCaseFee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminShareClientToSaleEmp = async (req, res) => {
   try {
      const { admin } = req
      const { shareClients = [], shareEmployee = [] } = req.body
      let bulkOps = []
      for (const toEmployeeId of shareEmployee) {
         const exists = await ShareSection.find({ toEmployeeId, clientId: { $in: shareClients } }, { clientId: 1 })
         let filter = shareClients?.filter(clientId => !exists?.map(ele => ele?.clientId?.toString())?.includes(clientId))
         filter?.forEach(clientId => {
            bulkOps.push({
               insertOne: {
                  document: {
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

export const adminAddCaseComment = async (req, res) => {
   try {
      const { admin } = req
      const { comment, isPrivate } = req.body
      if (!comment?.trim()) return res.status(400).json({ success: false, message: "Case Comment required" })
      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getCase = await Case.findById(req.body._id,)
      if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

      const newComment = new CaseComment({
         role: req?.user?.role,
         name: req?.user?.fullName,
         type: req?.user?.empType,
         message: comment?.trim(),
         isPrivate: isPrivate ?? false,
         caseId: getCase?._id?.toString(),
         adminId: req?.user?._id,
      })
      await newComment.save()



      // send notification through email and db notification
      const notificationEmpUrl = `/employee/view case/${getCase?._id?.toString()}`
      const notificationAdminUrl = `/admin/view case/${getCase?._id?.toString()}`

      sendNotificationAndMail(
         getCase?._id?.toString(),
         `New comment added on Case file No. ${getCase?.fileNo}`,
         getCase?.branchId || "",
         req?.user?._id,
         notificationEmpUrl,
         notificationAdminUrl
      )

      return res.status(200).json({ success: true, message: "Successfully add case commit" });
   } catch (error) {
      console.log("adminAddCaseCommit in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

// old version
// export const adminAddReferenceCaseAndMarge = async (req, res) => {
//    try {
//       const {admin} = req
//       // const verify = await authAdmin(req, res)
//       // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

//       // const admin = await Admin.findById(req?.user?._id)
//       // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
//       // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
//          if(getPartnerCase?.branchId?.toLowerCase()!=getClientCase?.branchId?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

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
//             partnerCode:getPartner?.profile?.consultantCode,
//             partnerReferenceCaseDetails: {
//                referenceId: getPartnerCase?._id?.toString(),
//                name: getPartner?.profile?.consultantName,
//                consultantCode:getPartner?.profile?.consultantCode,
//                referenceDate: new Date(),
//                by: admin?.fullName
//             },
//          }

//          if(getPartnerCase?.empSaleId && getPartnerCase?.empSaleName){
//             mergeParmeter["empSaleId"] = getPartnerCase?.empSaleId
//             mergeParmeter["empSaleName"] = getPartnerCase?.empSaleName
//          }

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   ...mergeParmeter
//                   // partnerId: getPartner?._id?.toString(),
//                   // partnerName: getPartner?.profile?.consultantName,
//                   // partnerCode:getPartner?.profile?.consultantCode,
//                   // empSaleId: getPartnerCase?.empSaleId || "",
//                   // empSaleName: getPartnerCase?.empSaleName || "",
//                   // partnerReferenceCaseDetails: {
//                   //    referenceId: getPartnerCase?._id?.toString(),
//                   //    name: getPartner?.profile?.consultantName,
//                   //    consultantCode:getPartner?.profile?.consultantCode,
//                   //    referenceDate: new Date(),
//                   //    by: admin?.fullName
//                   // },
//                }
//             }, { new: true })
//          await Case.findByIdAndUpdate(getPartnerCase?._id, { $set: { isPartnerReferenceCase: true, } })
//          const doc = await CaseDoc.updateMany({caseId:partnerCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
//          const status = await CaseStatus.updateMany({caseId:partnerCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
//          const comment = await CaseComment.updateMany({caseId:partnerCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
//          return res.status(200).json({ success: true, message: "Successfully add partner case reference ", data: updateAndMergeCase,doc,status,comment,partnerCaseId,clientCaseId });
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

//             if(getEmployeeCase?.branchId?.toLowerCase()!=getClientCase?.branchId?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

//          if (getEmployeeCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getEmployeeCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
//             return res.status(404).json({ success: false, message: "sale-employee and client must have same policyNo and emailId" })
//          }

//          let empMergeParmeter = {
//             empSaleId: getEmployee?._id?.toString(),
//             empSaleName: `${getEmployee?.fullName} | ${getEmployee?.type} | ${getEmployee?.designation}`,
//             empId:getEmployee?.empId,
//             empSaleReferenceCaseDetails: {
//                referenceId: getEmployeeCase?._id?.toString(),
//                name: getEmployee?.fullName,
//                empId:getEmployee?.empId,
//                referenceDate: new Date(),
//                by: admin?.fullName
//             },
//          }

//          if(getEmployeeCase?.partnerId && getEmployeeCase?.partnerName){
//             empMergeParmeter["partnerId"] = getEmployeeCase?.partnerId
//             empMergeParmeter["partnerName"] = getEmployeeCase?.partnerName
//             empMergeParmeter["partnerCode"] = getEmployeeCase?.partnerCode || ""
//          }

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   ...empMergeParmeter
//                   // empSaleId: getEmployee?._id?.toString(),
//                   // empSaleName:`${getEmployee?.fullName} | ${getEmployee?.type} | ${getEmployee?.designation}`,
//                   // empId:getEmployee?.empId,
//                   // partnerId: getEmployeeCase?.partnerId || "",
//                   // partnerName: getEmployeeCase?.partnerName || "",
//                   // partnerCode:getEmployeeCase?.partnerCode || "",
//                   // empSaleReferenceCaseDetails: {
//                   //    referenceId: getEmployeeCase?._id?.toString(),
//                   //    name: getEmployee?.fullName,
//                   //    empId:getEmployee?.empId,
//                   //    referenceDate: new Date(),
//                   //    by: admin?.fullName
//                   // },
//                }
//             }, { new: true })
//          await Case.findByIdAndUpdate(getEmployeeCase?._id, { $set: { isEmpSaleReferenceCase: true, } })
//          await CaseDoc.updateMany({caseId:empSaleCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
//          await CaseStatus.updateMany({caseId:empSaleCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
//          await CaseComment.updateMany({caseId:empSaleCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
//          return res.status(200).json({ success: true, message: "Successfully add case reference ", data: updateAndMergeCase });
//       }

//       return res.status(400).json({ success: true, message: "Failded to add case reference" });
//    } catch (error) {
//       console.log("adminAddRefenceCaseAndMarge in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }

// new version
export const adminAddReferenceCaseAndMarge = async (req, res) => {
   try {
      const { admin } = req
      const { partnerId, partnerCaseId, empSaleId, empSaleCaseId, clientCaseId } = req?.query

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

      if (isExistMergeTo?.partnerObjId) {
         mergeParmeter["partnerObjId"] = isExistMergeTo?.partnerObjId
         bulkOps.push({
            insertOne: {
               document: {
                  mergeCaseId: isExistMergeTo?._id,
                  caseId: getClientCase?._id,
                  partnerId: isExistMergeTo?.partnerObjId,
                  byEmpId: employee?._id
               }
            }
         })
      }

      if (isExistMergeTo?.empObjId) {
         mergeParmeter["empObjId"] = isExistMergeTo?.empObjId
         bulkOps.push({
            insertOne: {
               document: {
                  mergeCaseId: isExistMergeTo?._id,
                  caseId: getClientCase?._id,
                  empId: isExistMergeTo?.empObjId,
                  byEmpId: employee?._id
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
// export const adminRemoveReferenceCase = async (req, res) => {
//    try {
//       const {admin} = req
//       const { type, _id } = req?.query

//       if (!type) return res.status(400).json({ success: false, message: "Please select the type of reference to remove" })
//       if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid CaseId" })

//       if (type?.toLowerCase() == "partner") {
//          const getClientCase = await Case.findById(_id)
//          if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
//          if (!validMongooseId(getClientCase?.partnerReferenceCaseDetails?.referenceId) && !validMongooseId(getClientCase?.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partner ID /CaseId" })

//          if(getClientCase?.partnerReferenceCaseDetails?.referenceId){
//             const updatedPartnerCase = await Case.findByIdAndUpdate(getClientCase?.partnerReferenceCaseDetails?.referenceId, { $set: { isPartnerReferenceCase: false, } }, { new: true })
//             if (!updatedPartnerCase) return res.status(404).json({ success: false, message: "Partner case is not found of the added reference case" })
//          }

//          const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
//             {
//                $set: {
//                   partnerId: "",
//                   partnerName: "",
//                   partnerCode:"",
//                   partnerReferenceCaseDetails: {},
//                }
//             }, { new: true })
//             if(getClientCase?.partnerReferenceCaseDetails?.referenceId && !getClientCase?.empSaleId){
//                await CaseDoc.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
//                await CaseStatus.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
//                await CaseComment.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
//             }

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
//                   empId:"",
//                   empSaleReferenceCaseDetails: {},
//                }
//             }, { new: true })
//             await CaseDoc.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
//             await CaseStatus.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
//             await CaseComment.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})

//          return res.status(200).json({ success: true, message: "Successfully remove employee reference case" })
//       }

//       return res.status(400).json({ success: false, message: "Not a valid type" })
//    } catch (error) {
//       console.log("adminRemoveRefenceCase in error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error", error: error });
//    }
// }

// new version
export const adminRemoveReferenceCase = async (req, res) => {
   try {
      const { admin } = req

      const { type, _id } = req?.query
      if (!type) return res.status(400).json({ success: false, message: "Please select the type of reference to remove" })
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid CaseId" })

      const getClientCase = await Case.findById(_id)
      if (!getClientCase) return res.status(404).json({ success: false, message: "Case not found" })

      let filterOptions = { isActive: true }
      let updateMergeParameter = type?.toLowerCase() == "partner" ? { isPartnerReferenceCase: false, } : { isEmpSaleReferenceCase: false }
      let updateClientCaseParameter = type?.toLowerCase() == "partner" ? { partnerObjId: "" } : { empObjId: "" }
      if (type?.toLowerCase() == "partner") {
         filterOptions.partnerId = getClientCase?.partnerObjId
      } else if (type?.toLowerCase() == "sale-emp") {
         filterOptions.empId = getClientCase?.empObjId
      } else {
         return res.status(400).json({ success: false, message: "Not a valid type" })
      }

      filterOptions.caseId = getClientCase?._id
      const mergeCase = await CaseMergeDetails.findOne(filterOptions).select("mergeCaseId")
      if (!mergeCase) return res.status(404).json({ success: false, message: "Merge case not found" })

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



export const adminUnactiveCaseDoc = async (req, res) => {
   try {
      const { admin } = req
      const { _id, status } = req?.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid docId" })

      const updateDoc = await CaseDoc.findByIdAndUpdate(_id, { $set: { isActive: status } })
      if (!updateDoc) return res.status(404).json({ success: false, message: "Case-doc not found" })

      return res.status(200).json({ success: true, message: `Successfully ${!status ? "restore" : "remove"} case-doc` })
   } catch (error) {
      console.log("adminUnactiveCaseDoc in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminAllUnactiveCaseDoc = async (req, res) => {
   try {
      const { admin } = req
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllCaseDocQuery(searchQuery, startDate, endDate,)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })

      const getAllCaseDoc = await CaseDoc.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("caseId");
      const noOfCaseDoc = await CaseDoc.find(query?.query).count()

      return res.status(200).json({ success: true, message: `Successfully fetch case-doc`, data: getAllCaseDoc, totalDoc: noOfCaseDoc })
   } catch (error) {
      console.log("adminAllUnactiveCaseDoc in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminSetIsActiveCase = async (req, res) => {
   try {
      const { admin } = req

      const { _id, status } = req.query
      if (!_id || !status) return res.status(400).json({ success: false, message: "required case id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })

      return res.status(200).json({ success: true, message: `Now case ${updateCase?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveCase in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminDeleteCaseById = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { caseId } = req?.query
      if (!caseId) return res.status(400).json({ success: false, message: "caseId id required" })
      if (!validMongooseId(caseId)) return res.status(400).json({ success: false, message: "Not a valid caseId" })

      const deleteCaseById = await Case.findByIdAndDelete(caseId);
      if (!deleteCaseById) return res.status(404).json({ success: false, message: "Case not found" })

      return res.status(200).json({ success: true, message: "Successfully case deleted" });
   } catch (error) {
      console.log("adminDeleteCaseById in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminDeleteCaseDocById = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id } = req?.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid  docId" })

      const getCase = await CaseDoc.findById(_id);
      if (!getCase) return res.status(404).json({ success: false, message: "Case-doc not found" })

      const docUrl = getCase?.url?.toString()
      if (docUrl) {
         if (docUrl?.includes("https://firebasestorage.googleapis.com/")) {
            const parts = docUrl.split('/');
            const encodedFilename = parts[parts.length - 1];
            const endParts = encodedFilename?.split("?")?.[0]
            const decodedFilename = decodeURIComponent(endParts);
            if (decodedFilename) {
               const file = bucket.file(decodedFilename);
               await file.delete()
            }

         } else {
            const setAdminHeaders = {
               "x-auth-token": req?.headers["x-auth-token"]
            };

            const requestBody = {
               files: [docUrl]
            };

            const docRes = await axios.delete(
               `${process.env.STORAGE_URL}/api/storage/deleteSelectedFiles`,
               {
                  headers: setAdminHeaders,
                  data: requestBody
               }
            );
         }
      }

      await CaseDoc.findByIdAndDelete(_id)
      return res.status(200).json({ success: true, message: "Successfully case-doc deleted" });
   } catch (error) {
      console.log("adminDeleteCaseDocById in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminCreateOrUpdateCaseForm = async (req, res, next) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      await createOrUpdateCaseStatusForm(req, res, next)
   } catch (error) {
      console.log("adminCreateOrUpdateCaseForm in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminDeletePartnerById = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { partnerId } = req?.query
      if (!partnerId) return res.status(400).json({ success: false, message: "PartnerId id required" })
      if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid PartnerId" })

      const deleteParnterById = await Partner.findByIdAndDelete(partnerId);
      if (!deleteParnterById) return res.status(404).json({ success: false, message: "Parnter not found" })

      return res.status(200).json({ success: true, message: "Successfully Parnter deleted" });
   } catch (error) {
      console.log("adminDeletePartnerById in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminAddPartnerRefToEmp = async (req, res) => {
   try {
      const { admin } = req

      const { partnerId, empEmail } = req?.body
      if (!partnerId) return res.status(400).json({ success: false, message: "Partner id required" })
      if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid PartnerId" })

      if (!empEmail) return res.status(400).json({ success: false, message: "Employee email is required" })

      const findPartner = await Partner.findById(partnerId)
      if (!findPartner) return res.status(404).json({ success: false, message: "Parnter not found" })


      const findEmp = await Employee.findOne({ email: { $regex: empEmail, $options: "i" } })
      if (!findEmp) return res.status(404).json({ success: false, message: "Employee not found" })

      await ShareSection.deleteMany({ toEmployeeId: { $exists: true }, partnerId, clientId: { $exists: false }, caseId: { $exists: false } })
      const updatePartner = await Partner.findByIdAndUpdate(partnerId, { salesId: findEmp?._id })

      return res.status(200).json({ success: true, message: "Successfully add employee reference" });

   } catch (error) {
      console.log("adminAddPartnerRefToEmp in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminDeleteClientById = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { clientId } = req?.query
      if (!clientId) return res.status(400).json({ success: false, message: "ClientId id required" })
      if (!validMongooseId(clientId)) return res.status(400).json({ success: false, message: "Not a valid ClientId" })

      const deleteClientById = await Client.findByIdAndDelete(clientId);
      if (!deleteClientById) return res.status(404).json({ success: false, message: "Client not found" })

      return res.status(200).json({ success: true, message: "Successfully Client deleted" });
   } catch (error) {
      console.log("adminDeleteClientById in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminForgetPassword = async (req, res) => {
   try {
      if (!req.body.email) return res.status(400).json({ success: false, message: "Account email required" })
      const admin = await Admin.find({ email: req.body.email, })
      if (admin.length == 0) return res.status(404).json({ success: false, message: "Account not exist" })
      if (!admin[0]?.isActive) return res.status(404).json({ success: false, message: "Account not active" })



      const jwtToken = await Jwt.sign({ _id: admin[0]?._id, email: admin[0]?.email }, process.env.ADMIN_SECRET_KEY, { expiresIn: '5m' })
      try {
         await sendForgetPasswordMail(req.body.email, `/admin/resetPassword/${jwtToken}`);
         console.log("send forget password admin");
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

export const getAllAdmin = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (admin?.email !== process.env.ADMIN_MAIL_ID) return res.status(404).json({ success: false, message: "Access Denied!" })
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";

      const query = {
         $or: [
            { fullName: { $regex: searchQuery, $options: "i" } },
            { email: { $regex: searchQuery, $options: "i" } },
            { mobileNo: { $regex: searchQuery, $options: "i" } },
         ]
      }

      const noofAdmin = await Admin.find(query).count() - 1

      const allAdmins = await Admin.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const filterSuperAdmin = allAdmins.filter(admin => admin?.email.toLowerCase() !== process?.env?.ADMIN_MAIL_ID?.toLowerCase())
      res.status(200).json({ success: true, message: "Successfully get all admin", data: filterSuperAdmin, noofAdmin: noofAdmin })

   } catch (error) {
      console.log("get all admin error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const superAdminSetIsActiveAdmin = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (admin?.email !== process.env.ADMIN_MAIL_ID) return res.status(404).json({ success: false, message: "Access Denied!" })

      const { _id, status } = req.query
      if (!_id || !status) return res.status(400).json({ success: false, message: "required admin id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updateAdmin = await Admin.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateAdmin) return res.status(404).json({ success: false, message: "Admin not found" })

      return res.status(200).json({ success: true, message: `Now admin ${updateAdmin?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("superAdminSetIsActiveAdmin in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}

export const superAdminDeleteAdminById = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (admin?.email !== process.env.ADMIN_MAIL_ID) return res.status(404).json({ success: false, message: "Access Denied!" })

      const { _id } = req.query
      if (!_id) return res.status(400).json({ success: false, message: "required admin id" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const deleteAdminById = await Admin.findByIdAndDelete(_id);
      if (!deleteAdminById) return res.status(404).json({ success: false, message: "Admin not found" })

      return res.status(200).json({ success: true, message: "Successfully delete the admin" });
   } catch (error) {
      console.log("superAdminSetIsActiveAdmin in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}


export const adminResetForgetPassword = async (req, res) => {
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
         const admin = await Admin.findById(decode?._id)
         if (!admin?.isActive || !admin) return res.status(404).json({ success: false, message: "Account is not active" })
         const forgetPasswordClient = await Admin.findByIdAndUpdate(decode?._id, { $set: { password: bcryptPassword } })
         if (!forgetPasswordClient) return res.status(404).json({ success: false, message: "Account not exist" })
         return res.status(200).json({ success: true, message: "Successfully reset password" })
      } catch (error) {
         return res.status(401).json({ success: false, message: "Invalid/expired link" })
      }

   } catch (error) {
      console.log("get all admin case in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


//  for download data in excel
export const adminDownloadAllCase = async (req, res) => {
   try {
      const { admin } = req
      const { search: searchQuery = "", status: statusType = "", startDate = "", endDate = "", type = "", isReject = "", isClosed = "", isWeeklyFollowUp = "" } = req.query


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      const andCondition = [
         { isPartnerReferenceCase: false },
         { isEmpSaleReferenceCase: false },
         { isActive: Boolean(req.query.type == "true" ? true : false) },
         isReject == "true" ? { currentStatus: { $in: ["Reject"] } } : { currentStatus: { $nin: ["Reject"] } },
         ...(isClosed == "true" ? [{ currentStatus: { $in: ["Closed"] } }] : []),
         ...(isWeeklyFollowUp == "true" ? [{ currentStatus: { $nin: ["Closed", "Reject"] } }] : []),

      ]
      if (statusType) {
         andCondition.push(
            { currentStatus: { $regex: statusType, $options: "i" } },
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

   } catch (error) {
      console.log("adminDeleteClientById in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminDownloadAllPartner = async (req, res) => {
   try {
      const { admin } = req
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const getAllPartner = await Partner.find(query.query).select("-password").sort({ createdAt: -1 }).populate("salesId", "fullName type designation");

      // Generate Excel buffer
      const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner);

      res.setHeader('Content-Disposition', 'attachment; filename="partners.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)

   } catch (error) {
      console.log("adminDownloadAllPartner in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminDownloadPartnerReport = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
      if (!validMongooseId(req.query.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
      const partner = await Partner.findById(req.query.partnerId).select("-password")
      if (!partner) return res.status(404).json({ success: false, message: "Parnter not found" })
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      // const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req.query.partnerId, false, false, type)
      // if (!query.success) return res.status(400).json({ success: false, message: query.message })

      // const getAllCase = await Case.find(query?.query).sort({ createdAt: -1 });

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
      ];

      const result = await Case.aggregate(pipeline);

      const excelBuffer = await getDownloadCaseExcel(result)
      res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminEmpSaleReportDownload = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true
      const excludedTypes = ["sales", "operation", "finance", "sathi team", "branch"];
      const isNormalEmp = !excludedTypes.includes(empSale?.type?.toLowerCase())
      let empBranchId = false
      let branchWise = false

      const caseAccess = ["operation", "finance", "branch"]
      // if (caseAccess?.includes(empSale?.type?.toLowerCase())) {
      //    empBranchId = empSale?.branchId
      //    branchWise = true
      //    const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, isNormalEmp && empSale?._id?.toString(), true, false, !isNormalEmp && empSale?.branchId)
      //    if (!query.success) return res.status(400).json({ success: false, message: query.message })
      //  const getAllCase = await Case.find(query?.query).sort({ createdAt: -1 });
      //    const excelBuffer = await getDownloadCaseExcel(getAllCase,empSale?._id?.toString())
      //    res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      //    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      //    res.status(200)
      //    res.send(excelBuffer)
      // } else {
      //    let extactMatchQuery = [
      //       { referEmpId: empSale?._id },
      //       { _id: empSale?._id }
      //    ]

      //    if((empSale?.type?.toLowerCase()=="sales" && empSale?.designation?.toLowerCase()=="manager")){
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
      //          { branchId: { $regex: empSale?.branchId, $options: "i" } },
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
      //    const getAllCase = await Case.find(query).sort({ createdAt: -1 });
      //    const excelBuffer = await getDownloadCaseExcel(getAllCase,empSale?._id?.toString())
      //    res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      //    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      //    res.status(200)
      //    res.send(excelBuffer)
      // }

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

      if (caseAccess?.includes(empSale?.type?.toLowerCase()) || isNormalEmp) {
         // const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, isNormalEmp && empId, true, false,!isNormalEmp && empBranchId)
         // if (!query.success) return res.status(400).json({ success: false, message: query.message })

         // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
         // const noOfCase = await Case.find(query?.query).count()
         // return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });

         if (isNormalEmp && empSale?._id) {
            matchQuery.push({ addEmployee: { $in: empSale?._id?.toString() } })
         }

      } else {

         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if (empSale?.type?.toLowerCase() == "sales" && empSale?.designation?.toLowerCase() == "manager") {
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
                  { branchId: { $regex: empSale?.branchId, $options: "i" } },
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

      ];

      const result = await Case.aggregate(pipeline);
      const excelBuffer = await getDownloadCaseExcel(result, empSale?._id?.toString())
      res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)

   } catch (error) {
      console.log("adminEmpSaleReportDownload in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminEmpSalePartnerReportDownload = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })

      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const caseAccess = ["operation", "finance", "branch"]

      if (caseAccess?.includes(empSale?.type?.toLowerCase())) {
         const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate, empSale?.branchId)
         if (!query.success) return res.status(400).json({ success: false, message: query?.message })
         const getAllPartner = await Partner.find(query?.query).populate("salesId", "fullName type designation");
         const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner, empSale?._id?.toString());

         res.setHeader('Content-Disposition', 'attachment; filename="partners.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         res.send(excelBuffer)
      } else {
         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if ((empSale?.type?.toLowerCase() == "sales" && empSale?.designation?.toLowerCase() == "manager")) {
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
               { branchId: { $regex: empSale?.branchId, $options: "i" } },
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
         const getAllPartner = await Partner.find(query).populate("salesId", "fullName type designation");
         const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner, empSale?._id?.toString());

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

export const adminAllClientDownload = async (req, res) => {
   try {
      const result = await getAllClientResult(req)
      console.log("resu", result);

      if (result?.status == 1) {
         // Generate Excel buffer
         const excelBuffer = await getAllClientDownloadExcel(result?.data);
         res.setHeader('Content-Disposition', 'attachment; filename="clients.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         return res.send(excelBuffer)
      } else {
         return res.status(400).json({ success: false, message: "Something went wrong" });
      }
   } catch (error) {
      console.log("adminAllClientDownload in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const adminCreateInvoice = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { clientId, caseId } = req.query
      // console.log(clientId,caseId);
      // if(!validMongooseId(clientId) || !validMongooseId(caseId)) return res.status(400).json({ success: false, message: "caseId and clientId must be valid" })

      // const getClient = await Client.findById(clientId)
      // if(!getClient) return res.status(400).json({ success: false, message: "Client not found" })
      // const getCase = await Case.findById(caseId)
      // if(!getCase) return res.status(400).json({ success: false, message: "Case not found" })

      // const { error } = validateInvoice(req.body)
      // if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      // const billCount = await Bill.find({}).count()

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

         billRef = { caseId, clientId, branchId: getCase?.branchId }
      } else {
         billRef = { isOffice: true, paidBy: 'Office' }
      }


      const billCount = await Bill.find({}).count()
      let payload = {
         ...req.body,
         ...billRef,
         invoiceNo: `ACS-${billCount + 1}`
      }


      const newInvoice = new Bill({ ...payload })
      await newInvoice.save()
      return res.status(200).json({ success: true, message: "Successfully create invoice", _id: newInvoice?._id });
   } catch (error) {
      console.log("admin-create invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminViewAllInvoice = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type

      const query = getAllInvoiceQuery(searchQuery, startDate, endDate, false, type)
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
      return res.status(200).json({ success: true, message: "get case data", data: getAllBill, noOf: noOfBill, totalAmt: aggregateResult });

   } catch (error) {
      console.log("admin-get invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminDownloadAllInvoice = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type

      const query = getAllInvoiceQuery(searchQuery, startDate, endDate, false, type, false)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })

      const getAllBill = await Bill.find(query?.query).populate("transactionId", "paymentMode");

      const excelBuffer = await commonInvoiceDownloadExcel(getAllBill)

      res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)
   } catch (error) {
      console.log("employee-get invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminViewInvoiceById = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



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


export const adminEditInvoice = async (req, res) => {
   try {
      const { admin } = req
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
      console.log("admin-create invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminEditInvoiceNo = async (req, res) => {
   try {
      const { admin } = req
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


export const adminPaidInvoice = async (req, res) => {
   try {
      const { admin } = req
      const { _id } = req.body;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { remark = "", status } = req.body
      if (!status) return res.status(400).json({ success: false, message: "Status is required" })

      const invoice = await Bill.findByIdAndUpdate(_id, { $set: { remark: remark, isPaid: status == "paid" ? true : false, paidBy: "admin", paidDate: new Date() } })
      if (!invoice) return res.status(404).json({ success: true, message: "Details not found" });
      return res.status(200).json({ success: true, message: "Successfully update invoice" });

   } catch (error) {
      console.log("admin-Paid-Invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminUnActiveInvoice = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { _id, type } = req.query;
      console.log("type1", type);
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const invoice = await Bill.findByIdAndUpdate(_id, { $set: { isActive: type } })

      return res.status(200).json({ success: true, message: `Successfully ${type == "true" ? "restore" : "remove"} invoice` });
   } catch (error) {
      console.log("admin-remove invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminRemoveInvoice = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { _id, type } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const invoice = await Bill.findByIdAndDelete(_id)

      return res.status(200).json({ success: true, message: `Successfully delete invoice` });
   } catch (error) {
      console.log("admin-delete invoice in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminChangeBranch = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

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

export const adminViewEmpSathiEmployee = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

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
         query = getEmployeeByIdQuery(searchQuery, "sathi team", getEmp?.branchId)
      } else {
         query = {
            $and: [
               { isActive: true },
               getEmp?.designation?.toLowerCase() == "executive" ? { referEmpId: getEmp?._id } : {},
               { branchId: { $regex: getEmp?.branchId, $options: "i" } },
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


export const adminDownloadEmpSathiEmployee = async (req, res) => {
   try {
      const { admin } = req
      // const verify =  await authAdmin(req,res)
      // if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const searchQuery = req.query.search ? req.query.search : "";
      const empId = req.query.empId

      if (!validMongooseId(empId)) return res.status(400).json({ success: false, message: "Not a valid Id" })
      const getEmp = await Employee.findById(empId)
      if (!getEmp) return res.status(400).json({ success: false, message: "Employee not found" })

      const caseAccess = ["operation", "finance", "branch"]
      let query = {}
      console.log(caseAccess?.includes(getEmp?.type?.toLowerCase()), "----");
      if (caseAccess?.includes(getEmp?.type?.toLowerCase())) {
         query = getEmployeeByIdQuery(searchQuery, "sathi team", getEmp?.branchId)
      } else {
         query = {
            $and: [
               { isActive: true },
               getEmp?.designation?.toLowerCase() == "executive" ? { referEmpId: getEmp?._id } : {},
               { branchId: { $regex: getEmp?.branchId, $options: "i" } },
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


// 

export const adminSyncModal = async (req, res) => {
   try {
      const getAllCase = await Case.find({})
      const superAdmin = await Admin.find({ email: process.env.ADMIN_MAIL_ID })

      await Promise.all(getAllCase?.map(async (myCase) => {
         await Promise.all(myCase?.caseDocs?.map(async (doc) => {
            const newCaseDoc = new CaseDoc({
               name: doc?.docName,
               type: doc?.docType,
               format: doc?.docFormat,
               url: doc?.docURL,
               docDate: doc?.docDate,
               caseId: myCase?._id?.toString(),
               adminId: superAdmin?.[0]?._id
            })
            return newCaseDoc.save()
         }))

         await Promise.all(myCase?.processSteps?.map(async (status) => {
            const newCaseStatus = new CaseStatus({
               status: status?.status,
               remark: status?.remark,
               consultant: status?.consultant,
               caseId: myCase?._id?.toString(),
               date: status?.date,
               adminId: superAdmin?.[0]?._id
            })
            return newCaseStatus.save()
         }))

         await Promise.all(myCase?.caseCommit?.map(async (comment) => {
            const newCaseComment = new CaseComment({
               name: comment?.name,
               role: comment?.role,
               type: comment?.type,
               message: comment?.commit,
               caseId: myCase?._id?.toString(),
               date: comment?.Date,
               adminId: superAdmin?.[0]?._id
            })
            return newCaseComment.save()
         }))
      }))

      return res.status(200).json({ success: true, message: "Modal created successfully", data: { _id: isExistStatement?._id } });
   } catch (error) {
      console.log("adminSyncModal in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const createOrUpdateStatement = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { _id, partnerEmail, empEmail, partnerId, empId } = req.body

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
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { empId, partnerId, startDate, endDate, limit, pageNo, isPdf } = req.query
      const pageItemLimit = limit ? limit : 10;
      const page = pageNo ? (pageNo - 1) * pageItemLimit : 0;


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      let matchQuery = []

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

export const adminDownloadAllStatement = async (req, res) => {
   try {
      const { admin } = req
      const { empId, partnerId, startDate, endDate } = req.query

      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      let matchQuery = []

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

export const adminChangeStatementStatus = async (req, res) => {
   try {
      const { admin } = req

      const { _id } = req.body;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { remark = "", status } = req.body
      if (!status) return res.status(400).json({ success: false, message: "Status is required" })

      const invoice = await Statement.findByIdAndUpdate(_id, { $set: { remark: remark, isPaid: status == "paid" ? true : false, paidBy: "operation", paidDate: new Date() } })
      if (!invoice) return res.status(404).json({ success: true, message: "Details not found" });
      return res.status(200).json({ success: true, message: "Successfully update statement" });
   } catch (error) {
      console.log("admin-Paid-statement in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}


export const getAllStatement = async (req, res) => {
   try {
      const { admin } = req

      const { search, startDate, endDate, limit, pageNo } = req.query
      const pageItemLimit = limit ? limit : 10;
      const page = pageNo ? (pageNo - 1) * pageItemLimit : 0;


      if (startDate && endDate) {
         const validStartDate = getValidateDate(startDate)
         if (!validStartDate) return res.status(400).json({ success: false, message: "start date not formated" })
         const validEndDate = getValidateDate(endDate)
         if (!validEndDate) return res.status(400).json({ success: false, message: "end date not formated" })
      }

      let matchQuery = []

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
                        'bankingDetails.bankName': 1,
                        'bankingDetails.bankAccountNo': 1,
                        'bankingDetails.bankBranchName': 1,
                        'bankingDetails.panNo': 1,
                        'bankingDetails.branchId': 1,
                        'profile.consultantName': 1,
                        'profile.consultantCode': 1,
                        'profile.address': 1,
                        'branchId': 1,
                     }
                  },
                  {
                     "$lookup": {
                        from: 'employees',
                        localField: 'salesId',
                        foreignField: '_id',
                        as: 'salesId',
                        pipeline: [
                           {
                              "$project": {
                                 "fullName": 1
                              }
                           }
                        ]
                     }
                  },
                  {
                     $unwind: {
                        path: '$salesId',
                        preserveNullAndEmptyArrays: true
                     }
                  },
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
                        'bankName': 1,
                        'bankBranchName': 1,
                        'bankAccountNo': 1,
                        'panNo': 1,
                        'address': 1,
                        'branchId': 1,
                        'empId': 1,
                     }
                  },
                  {
                     "$lookup": {
                        "from": 'employees',
                        "localField": 'referEmpId',
                        "foreignField": '_id',
                        "as": 'referEmpId',
                        "pipeline": [
                           {
                              "$project": {
                                 "fullName": 1
                              }
                           }
                        ]
                     }
                  },
                  {
                     "$unwind": {
                        "path": '$referEmpId',
                        "preserveNullAndEmptyArrays": true
                     }
                  },
               ]
            }
         },
         {
            "$unwind": {
               "path": '$empDetails',
               "preserveNullAndEmptyArrays": true
            }
         },
         {
            "$match": {
               "$and": [
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

export const getAllNotification = async (req, res) => {
   try {
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const allNotification = await Notification.find({ adminIds: { $nin: [req?.user?._id] } }).populate({
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
      const { admin } = req
      // const verify = await authAdmin(req, res)
      // if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      // const admin = await Admin.findById(req?.user?._id)
      // if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      // if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const markNotification = req.body?.markNotification || []


      await Notification.updateMany({ _id: { $in: markNotification } }, { $push: { adminIds: req?.user?._id } })
      return res.status(200).json({ success: true, message: `Successfully mark as read notification` });

   } catch (error) {
      console.log("updateNotification in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

   }
}

export const adminFindCaseByFileNo = async (req, res) => {
   try {
      const { admin } = req
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
               'email': 1,
               'mobileNo': 1,
               'address': 1,
               'pinCode': 1,
               'city': 1,
               'state': 1,
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

export const adminAddOrUpdateEmpJoiningForm = async (req, res) => {
   try {
      const { admin } = req
      const { empId } = req.body

      let isExist = await EmployeeJoiningForm.findOne({ empId })

      if (!isExist) {
         isExist = new EmployeeJoiningForm({ empId })
      }

      const updateKeys = ["name", "fatherName", "correspondenceAddress", "permanentAddress", "telephone", "mobile", "email",
         "dateOfBirth", "maritalStatus", "panCardNo", "bloodGroup", "emergencyContact", "educationalDetails",
         "employmentDetails", "familyDetails", "professionalReferences", "signature", "place", "date",]

      updateKeys.forEach(key => {
         if (req.body[key]) {
            isExist[key] = req.body[key]
         }
      })

      isExist.isActive = true
      await isExist.save()
      return res.status(200).json({ success: true, message: `Success` });

   } catch (error) {
      console.log("addOrUpdateEmpJoiningForm in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });
   }
}

export const admingetEmpJoiningForm = async (req, res) => {
   try {
      const { admin } = req
      const { empId } = req.query
      let isExist = await EmployeeJoiningForm.findOne({ empId })
      return res.status(200).json({ success: true, message: `Success`, data: isExist });

   } catch (error) {
      console.log("addOrUpdateEmpJoiningForm in error:", error);
      res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });
   }
}


import GROStatus from "../models/groStatus.js"; // old model
import OmbudsmanStatus from "../models/ombudsmanStatus.js"; // old model
import CaseFormModal from "../models/caseForm/caseForm.js";
import CaseFormSectionModal from "../models/caseForm/caseFormSection.js";
import CaseFormAttachmentModal from "../models/caseForm/caseFormAttachment.js";
import { caseUpdateStatusTemplate } from "../utils/emailTemplates/caseUpdateStatusTemplate.js";

export const migrateGROForms = async (req, res) => {
   try {
      const oldForms = await GROStatus.find({ isActive: true });

      for (const old of oldForms) {
         // 1️⃣ Create new CaseForm
         const caseForm = new CaseFormModal({
            caseId: old.caseId,
            clientId: old.clientId,
            branchId: old.branchId || "",
            formType: "gro",
            partnerFee: old.partnerFee || "",
            consultantFee: old.consultantFee || "",
            filingDate: old.groFilingDate || "",
            isSettelment: old.isSettelment,
            approved: old.approved,
            approvedAmount: old.approvedAmount || "",
            approvalDate: old.approvalDate,
            approvalLetter: old.approvalLetter,
            approvalLetterPrivate: old.approvalLetterPrivate,
            specialCase: old.specialCase,
            ...(old?.paymentDetailsId ? { paymentDetailsId: old?.paymentDetailsId } : {}),
            ...(old?.statementId ? { statementId: old?.statementId } : {}),
            ...(old?.billId ? { billId: old?.billId } : {}),
         });

         await caseForm.save();

         // 2️⃣ Map old sections to new sections
         const sectionMappings = [
            { oldKey: "groStatusUpdates", type: "status" },
            { oldKey: "queryHandling", type: "query" },
            { oldKey: "queryReply", type: "query_reply" },
         ];

         for (const mapping of sectionMappings) {
            const oldSection = old[mapping.oldKey] || [];

            for (const sec of oldSection) {
               // create new section doc
               const sectionDoc = new CaseFormSectionModal({
                  caseFormId: caseForm._id,
                  type: mapping.type,
                  status: sec.status || "",
                  remarks: sec.remarks || "",
                  date: sec.date || new Date(),
                  isPrivate: sec.isPrivate || false,
                  deliveredBy: sec.byCourier ? "courier" : (sec.byMail ? "mail" : ""),
               });

               await sectionDoc.save();

               // handle old attachments
               if (sec.attachment) {
                  const att = new CaseFormAttachmentModal({
                     caseFormId: caseForm._id,
                     caseFormSectionId: sectionDoc._id,
                     url: sec.attachment,
                     fileName: sec.attachment.split("/").pop(),
                     fileType: sec.attachment.split(".").pop(),
                  });
                  await att.save();
               }
            }
         }

         console.log(`Migrated GRO Form: ${old._id} → CaseForm: ${caseForm._id}`);
      }

      res.status(200).json({ message: "Migration completed successfully!" })
   } catch (err) {
      console.error("Migration error:", err);
      res.status(500).json({ message: "Something went wrong", err })
   }
};

export const migrateOmbusmanForms = async (req, res) => {
   try {
      const oldForms = await OmbudsmanStatus.find({ isActive: true });

      for (const old of oldForms) {
         // 1️⃣ Create new CaseForm
         const caseForm = new CaseFormModal({
            caseId: old.caseId,
            clientId: old.clientId,
            branchId: old.branchId || "",
            formType: "ombudsman",
            partnerFee: old.partnerFee || "",
            consultantFee: old.consultantFee || "",
            filingDate: old.filingDate || "",
            isSettelment: old.isSettelment,
            approved: old.approved,
            approvedAmount: old.approvedAmount || "",
            approvalDate: old.approvalDate,
            approvalLetter: old.approvalLetter,
            approvalLetterPrivate: old.approvalLetterPrivate,
            specialCase: old.specialCase,
            method: old?.method || 'online',
            complaintNumber: old?.complaintNumber || '',
            ...(old?.paymentDetailsId ? { paymentDetailsId: old?.paymentDetailsId } : {}),
            ...(old?.statementId ? { statementId: old?.statementId } : {}),
            ...(old?.billId ? { billId: old?.billId } : {}),
         });

         await caseForm.save();

         // 2️⃣ Map old sections to new sections
         const sectionMappings = [
            { oldKey: "statusUpdates", type: "status" },
            { oldKey: "queryHandling", type: "query" },
            { oldKey: "queryReply", type: "query_reply" },
            { oldKey: "hearingSchedule", type: "hearing_schedule" },
            { oldKey: "awardPart", type: "award_part" },
            { oldKey: "attachmentPart", type: "attachment_part" },

         ];

         for (const mapping of sectionMappings) {
            const oldSection = old[mapping.oldKey] || [];

            for (const sec of oldSection) {
               // create new section doc
               const sectionDoc = new CaseFormSectionModal({
                  caseFormId: caseForm._id,
                  type: mapping.type,
                  status: sec.status || "",
                  remarks: sec.remarks || "",
                  ...(sec.date ? { date: sec.date } : {}),
                  ...(sec.type ? { awardType: sec.type } : {}),
                  isPrivate: sec.isPrivate || false,
                  deliveredBy: sec.byCourier ? "courier" : (sec.byMail ? "mail" : ""),
               });

               await sectionDoc.save();

               // handle old attachments
               if (sec.attachment) {
                  const att = new CaseFormAttachmentModal({
                     caseFormId: caseForm._id,
                     caseFormSectionId: sectionDoc._id,
                     url: sec.attachment,
                     fileName: sec.attachment.split("/").pop(),
                     fileType: sec.attachment.split(".").pop(),
                  });
                  await att.save();
               }
            }
         }

         console.log(`Migrated GRO Form: ${old._id} → CaseForm: ${caseForm._id}`);
      }

      res.status(200).json({ message: "Migration completed successfully!" })
   } catch (err) {
      console.error("Migration error:", err);
      res.status(500).json({ message: "Something went wrong", err })
   }
};