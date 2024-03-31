import Admin from "../models/admin.js";
import {
   validateAdminSignUp, validateAdminSignIn, validateAdminResetPassword, validateUpdateAdminCase,
   validateAdminSettingDetails, validateAdminAddCaseFee, validateAdminUpdateCasePayment, validateAdminAddEmployeeToCase,
   validateEditAdminCaseStatus,validateAdminSharePartner
} from "../utils/validateAdmin.js";
import bcrypt from 'bcrypt';
import { generatePassword } from "../utils/helper.js";
import { sendAdminSigninMail, sendEmployeeSigninMail, sendForgetPasswordMail } from "../utils/sendMail.js";
import { authAdmin } from "../middleware/authentication.js";
import Employee from "../models/employee.js";
import { validateEmployeeSignUp, validateEmployeeUpdate } from "../utils/validateEmployee.js";
import { validMongooseId } from "../utils/helper.js";
import Case from "../models/case.js";
import {
   getAllPartnerSearchQuery, getAllClientSearchQuery, getAllCaseQuery,
   getAllEmployeeSearchQuery, getDownloadCaseExcel, getAllPartnerDownloadExcel,getAllClientDownloadExcel
} from "../utils/helper.js";
import Partner from "../models/partner.js";
import Client from '../models/client.js'
import { validateAddClientCase, validateClientProfileBody } from "../utils/validateClient.js";
import { trusted } from "mongoose";
import Jwt from 'jsonwebtoken'
import { validateResetPassword } from "../utils/helper.js";
import jwtDecode from "jwt-decode";
import { validateBankingDetailsBody, validateProfileBody } from "../utils/validatePatner.js";
import axios from "axios";
import ExcelJS from 'exceljs';
import { Readable } from 'stream';



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


export const adminSignUp = async (req, res) => {
   try {
      const { error } = validateAdminSignUp(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      // if(req.body.key!==process.env.ADMIN_SIGNUP_SECRET_KEY) return res.status(400).json({success:false,message:"Unauthorized access"})

      const admin = await Admin.find({ email: req.body.email })
      if (admin.length > 0) return res.status(401).json({ success: false, message: "Admin account already exists" })

      const systemPassword = generatePassword();
      const bcryptPassword = await bcrypt.hash(systemPassword, 10)
      const newAdmin = new Admin({
         fullName: req.body.fullName,
         email: req.body.email,
         mobileNo: req.body.mobileNo,
         password: bcryptPassword,
      })
      try {
         await sendAdminSigninMail(systemPassword, req.body.email);
         await newAdmin.save()
         res.status(200).json({ success: true, message: "Credentials send", systemPassword: systemPassword });
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

      const admin = await Admin.find({ email: req.body.email })
      if (admin.length == 0) return res.status(404).json({ success: false, message: "Admin account not exists" })

      if (!admin[0]?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const checkAuthAdmin = await bcrypt.compare(req.body.password, admin?.[0]?.password)
      if (!checkAuthAdmin) return res.status(401).json({ success: false, message: "invaild email/password" })
      // console.log("admin",admin);
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const { error } = validateAdminResetPassword(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id).select("-password")
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



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
      const verify = await authAdmin(req, res);
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message });
      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const noOfClient = await Client.find({ isActive: true }).count()
      const noOfPartner = await Partner.find({ isActive: true }).count()
      const noOfEmployee = await Employee.find({ isActive: true }).count()
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
      const pieChartData = await Case.aggregate([
         {
            '$match': {
               'createdAt': { $gte: currentYearStart },
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
               'createdAt': { $gte: currentYearStart },
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, status } = req.query
      // console.log("emp",_id,status);
      if (!_id || !status) return res.status(400).json({ success: false, message: "required employee id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      // console.log("status",status);
      const updateEmployee = await Employee.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateEmployee) return res.status(404).json({ success: false, message: "Employee not found" })
      // console.log("update",updateEmployee);

      return res.status(200).json({ success: true, message: `Now employee ${updateEmployee?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}


export const createEmployeeAccount = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { error } = validateEmployeeSignUp(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const existEmployee = await Employee.find({ email: req.body.email })
      if (existEmployee.length > 0) return res.status(401).json({ success: false, message: "Employee account already exists" })

      const systemPassword = generatePassword()
      const bcryptPassword = await bcrypt.hash(systemPassword, 10)
      const newEmployee = new Employee({
         fullName: req.body.fullName,
         email: req.body.email,
         mobileNo: req.body.mobileNo,
         password: bcryptPassword,
         type: req?.body?.type ? req?.body?.type : "assistant",
      })
      try {
         await sendEmployeeSigninMail(req.body.email, systemPassword);
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

export const adminUpdateEmployeeAccount = async (req, res) => {
   try {
      const { _id } = req.query
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { error } = validateEmployeeUpdate(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const updateEmployee = await Employee.findByIdAndUpdate(_id, {
         $set: {
            fullName: req.body.fullName,
            type: req.body.type,
            designation: req.body.designation,
         }
      })
      if (!updateEmployee) return res.status(401).json({ success: false, message: "Employee not found" })
      return res.status(200).json({ success: true, message: "Successfully update Employee" });



   } catch (error) {
      console.log("updateEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminDeleteEmployeeAccount = async (req, res) => {
   try {
      const { _id } = req.query
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";

      const query = getAllEmployeeSearchQuery(searchQuery)
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminGetSaleEmployee = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";

      let query = {
         $and:[
            { type: { $regex: "sales", $options: "i" }},
            {
             $or: [
                  { fullName: { $regex: searchQuery, $options: "i" }},
                  { email: { $regex: searchQuery, $options: "i" }},
                  { mobileNo: { $regex: searchQuery, $options: "i" }},
                  { type: { $regex: searchQuery, $options: "i" }},
                  { designation: { $regex: searchQuery, $options: "i" }},

              ]
            }
         ]
         };
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get sale employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminGetNormalEmployee = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";

      const excludedTypes = ["Sales", "Operation", "Finance"];
      let query = {
         $and:[
            { type: { $nin: excludedTypes }},
            {
             $or: [
                  { fullName: { $regex: searchQuery, $options: "i" }},
                  { email: { $regex: searchQuery, $options: "i" }},
                  { mobileNo: { $regex: searchQuery, $options: "i" }},
                  { type: { $regex: searchQuery, $options: "i" }},
                  { designation: { $regex: searchQuery, $options: "i" }},

              ]
            }
         ]
         };
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get normal employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const changeStatusAdminCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { error } = validateUpdateAdminCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })


      const updateStatusBody = { date: new Date(), status: req.body.status, remark: req.body.remark, consultant: admin?.fullName }

      const updateCase = await Case.findByIdAndUpdate(req.body._id, { $push: { processSteps: updateStatusBody }, currentStatus: req.body.status }, { new: true })
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      return res.status(200).json({ success: true, message: `Case status change to ${req.body.status}` });
   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const adminEditCaseStatus = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { error } = validateEditAdminCaseStatus(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      if (!validMongooseId(req.body.caseId) || !validMongooseId(req.body.processId)) return res.status(400).json({ success: false, message: "Not a valid processId or caseId" })

      const updateCase = await Case.findByIdAndUpdate(req.body.caseId, {
         $set: {
            'processSteps.$[elem].status': req.body.status,
            'processSteps.$[elem].remark': req.body.remark,
            ...(req.body.isCurrentStatus ? { currentStatus: req.body.status } : {}),
            'processSteps.$[elem].consultant': admin?.fullName,
         }
      },
         {
            "arrayFilters": [{ "elem._id": req.body?.processId }],
            new: true
         },)
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      return res.status(200).json({ success: true, message: "Successfully update case process" });
   } catch (error) {
      console.log("updateAdminCaseProcess in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const viewAllAdminCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      console.log("query", query?.query);
      const aggregationPipeline = [
         { $match: query?.query }, // Match the documents based on the query
         {
            $group: {
               _id: null,
               totalAmtSum: { $sum: "$claimAmount" } // Calculate the sum of totalAmt
            }
         }
      ];
      // console.log("query", query);

      const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfCase = await Case.find(query?.query).count()
      const aggregateResult = await Case.aggregate(aggregationPipeline);
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: aggregateResult });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewPartnerReport = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
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

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req.query.partnerId, false, false, type)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      console.log("query", query?.query);
      const aggregationPipeline = [
         { $match: query?.query }, // Match the documents based on the query
         {
            $group: {
               _id: null,
               totalAmtSum: { $sum: "$claimAmount" } // Calculate the sum of totalAmt
            }
         }
      ];

      const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfCase = await Case.find(query?.query).count()
      const aggregateResult = await Case.aggregate(aggregationPipeline);
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: aggregateResult, user: partner });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewEmpSaleReport = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      if (empSale.type?.toLowerCase() != "sales") return res.status(404).json({ success: false, message: "Employee designation is not sale" })
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type, empSaleId)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const aggregationPipeline = [
         { $match: query?.query }, // Match the documents based on the query
         {
            $group: {
               _id: null,
               totalAmtSum: { $sum: "$claimAmount" }
            }
         }
      ];

      const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfCase = await Case.find(query?.query).count()
      const aggregateResult = await Case.aggregate(aggregationPipeline);
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: aggregateResult, user: empSale });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewEmpSalePartnerReport = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      if (empSale.type?.toLowerCase() != "sales") return res.status(404).json({ success: false, message: "Employee designation is not sale" })


      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllPartnerSearchQuery(searchQuery, type, empSaleId, startDate, endDate)
      if (!query.success) return res.status(400).json({ success: false, message: query?.message })
      const getAllPartner = await Partner.find(query?.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfPartner = await Partner.find(query?.query).count()
      return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });

   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const viewCaseByIdByAdmin = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getCase = await Case.findById(_id)
      if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })
      return res.status(200).json({ success: true, message: "get case data", data: getCase });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const viewAllPartnerByAdmin = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const getAllPartner = await Partner.find(query.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfPartner = await Partner.find(query.query).count()
      return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });

   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const viewPartnerByIdByAdmin = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { error } = validateProfileBody(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })
      const updatePatnerDetails = await Partner.findByIdAndUpdate(_id, {
         $set: {
            "profile.profilePhoto": req.body.profilePhoto,
            "profile.consultantName": req.body.consultantName,
            "profile.alternateEmail": req.body.alternateEmail,
            "profile.alternateMobileNo": req.body.alternateMobileNo,
            "profile.primaryMobileNo": req.body.primaryMobileNo,
            "profile.whatsupNo": req.body.whatsupNo,
            "profile.panNo": req.body.panNo,
            "profile.aadhaarNo": req.body.aadhaarNo,
            "profile.dob": req.body.dob,
            "profile.designation": req.body.designation,
            "profile.areaOfOperation": req.body.areaOfOperation,
            "profile.workAssociation": req.body.workAssociation,
            "profile.state": req.body.state,
            "profile.gender": req.body.gender,
            "profile.district": req.body.district,
            "profile.city": req.body.city,
            "profile.pinCode": req.body.pinCode,
            "profile.about": req.body.about,
         }
      }, { new: true })

      if (!updatePatnerDetails) return res.status(400).json({ success: true, message: "Partner not found" })
      return res.status(200).json({ success: true, message: "Successfully update partner profile" })
   } catch (error) {
      console.log("updatePatnerDetails: ", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminUpdatePartnerBankingDetails = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const { error } = validateBankingDetailsBody(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const updatePatnerDetails = await Partner.findByIdAndUpdate(_id, {
         $set: {
            "bankingDetails.bankName": req.body.bankName,
            "bankingDetails.bankAccountNo": req.body.bankAccountNo,
            "bankingDetails.bankBranchName": req.body.bankBranchName,
            "bankingDetails.gstNo": req.body.gstNo,
            "bankingDetails.panNo": req.body.panNo,
            "bankingDetails.cancelledChequeImg": req.body.cancelledChequeImg,
            "bankingDetails.gstCopyImg": req.body.gstCopyImg,
            "bankingDetails.ifscCode": req.body.ifscCode,
            "bankingDetails.upiId": req.body.upiId,

         }
      }, { new: true })
      if (!updatePatnerDetails) return res.status(400).json({ success: true, message: "Partner not found" })
      return res.status(200).json({ success: true, message: "Successfully update banking details" })
   } catch (error) {
      console.log("updatePatnerDetails: ", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}




export const adminSetIsActivePartner = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, status } = req.query
      // console.log("emp",id,status);
      if (!_id || !status) return res.status(400).json({ success: false, message: "required partner id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      // console.log("status",status);
      const updatePartner = await Partner.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updatePartner) return res.status(404).json({ success: false, message: "Partner not found" })
      // console.log("update",updatePartner);

      return res.status(200).json({ success: true, message: `Now partner ${updatePartner?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}


export const adminSetPartnerTag = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req.query.type ? req.query.type : true
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      console.log("type", type, pageItemLimit, pageNo, searchQuery);

      const query = getAllClientSearchQuery(searchQuery, type,startDate,endDate)
      if(!query?.success) return res.status(400).json({success:false,message:query.message})
      const getAllClient = await Client.find(query.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfClient = await Client.find(query.query).count()

      return res.status(200).json({ success: true, message: "get client data", data: getAllClient, noOfClient: noOfClient });

   } catch (error) {
      console.log("adminViewAllClient in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewClientById = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Client account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const mycase = await Case.find({ _id: _id })
      if (mycase.length == 0) return res.status(404).json({ success: false, message: "Case not found" })

      const { error } = validateAddClientCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      req.body.caseDocs = req?.body?.caseDocs?.map(caseFile => {
         return {
            docDate: caseFile?.docDate ? caseFile?.docDate : new Date(),
            docName: caseFile?.docName,
            docType: caseFile?.docFormat,
            docFormat: caseFile?.docFormat,
            docURL: caseFile?.docURL,
         }
      })

      console.log("case_id", _id, req.body);

      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body } }, { new: true })
      return res.status(200).json({ success: true, message: "Successfully update case", data: updateCase });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminSetIsActiveClient = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, status } = req.query
      // console.log("emp",id,status);
      if (!_id || !status) return res.status(400).json({ success: false, message: "required client id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      // console.log("status",status);
      const updateClient = await Client.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateClient) return res.status(404).json({ success: false, message: "Client not found" })
      // console.log("update",updatePartner);

      return res.status(200).json({ success: true, message: `Now client ${updateClient?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveClient in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}


// for case




export const adminAddCaseFeeClient = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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

export const adminShareCaseToEmployee = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      
      const { error } = validateAdminAddEmployeeToCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const updateCase = req.body?.shareCase?.map(caseShare => Case.findByIdAndUpdate(caseShare, { $push: { addEmployee: { $each: req?.body?.shareEmployee } } }, { new: true }))
      console.log("updateCase", updateCase);
      const allUpdateCase = await Promise.all(updateCase)
      return res.status(200).json({ success: true, message: "Successfully employee add to case" });
   } catch (error) {
      console.log("adminSetCaseFee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminSharePartnerToSaleEmp = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      
      const { error } = validateAdminSharePartner(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      const updatePartners = req.body?.sharePartners?.map(casePartners => Partner.findByIdAndUpdate(casePartners, { $push: { shareEmployee: { $each: req?.body?.shareEmployee } } }, { new: true }))
      console.log("updatePartners", updatePartners);
      try {
         const allUpdatePartner = await Promise.all(updatePartners)
         return res.status(200).json({ success: true, message: "Successfully share partner" });
      } catch (error) {
         return res.status(400).json({ success: false, message: "Failed to share" })
      }

   } catch (error) {
      console.log("adminSetCaseFee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminAddCaseComment = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      if (!req?.body?.Comment) return res.status(400).json({ success: false, message: "Case Comment required" })
      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })


      const newCommit = {
         _id: req?.user?._id,
         role: req?.user?.role,
         name: req?.user?.fullName,
         type: req?.user?.role,
         commit: req?.body?.Comment, Date: new Date()
      }
      const updateCase = await Case.findByIdAndUpdate(req.body._id, { $push: { caseCommit: newCommit } }, { new: true })
      if (!updateCase) return res.status(400).json({ success: false, message: "Case not found" })

      return res.status(200).json({ success: true, message: "Successfully add case commit" });
   } catch (error) {
      console.log("adminAddCaseCommit in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminAddReferenceCaseAndMarge = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { partnerId, partnerCaseId, empSaleId, empSaleCaseId, clientCaseId } = req?.query
      if (!validMongooseId(clientCaseId)) return res.status(400).json({ success: false, message: "Not a valid clientCaseId" })

      if (!partnerId && !empSaleId) return res.status(400).json({ success: false, message: "For add case refernce must provide partnerId or employeeId" })
      if (partnerId) {
         if (!partnerId || !partnerCaseId) return res.status(400).json({ success: false, message: "For add partner reference partnerId,partnerCaseId are required" })
         if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
         if (!validMongooseId(partnerCaseId)) return res.status(400).json({ success: false, message: "Not a valid partnerCaseId" })

         const getPartner = await Partner.findById(partnerId)
         if (!getPartner) return res.status(404).json({ success: false, message: "Partner Not found" })

         const getPartnerCase = await Case.findById(partnerCaseId)
         if (!getPartnerCase) return res.status(404).json({ success: false, message: "Partner case Not found" })


         const getClientCase = await Case.findById(clientCaseId)
         if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
         console.log(getPartnerCase?.policyNo?.toLowerCase(), getClientCase?.policyNo?.toLowerCase(), getPartnerCase?.email?.toLowerCase(), getClientCase?.email?.toLowerCase());

         if (getPartnerCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getPartnerCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
            return res.status(404).json({ success: false, message: "Partner and client must have same policyNo and emailId" })
         }

         if (getClientCase?.partnerReferenceCaseDetails?._id) {
            return res.status(404).json({ success: false, message: "Case already have the partner case reference" })
         }

         const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
            {
               $set: {
                  partnerId: getPartner?._id?.toString(),
                  partnerName: getPartner?.fullName,
                  partnerReferenceCaseDetails: {
                     referenceId: getPartnerCase?._id?.toString(),
                     name: getPartner?.fullName,
                     referenceDate: new Date(),
                     by: admin?.fullName
                  },
               }
            }, { new: true })
         await Case.findByIdAndUpdate(getPartnerCase?._id, { $set: { isPartnerReferenceCase: true, } })
         return res.status(200).json({ success: true, message: "Successfully add case reference ", data: updateAndMergeCase });
      }
      if (empSaleId) {
         if (!empSaleId || !empSaleCaseId) return res.status(400).json({ success: false, message: "For add sale reference empSaleId,empSaleCaseId are required" })
         if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid empSaleId" })
         if (!validMongooseId(empSaleCaseId)) return res.status(400).json({ success: false, message: "Not a valid empSaleCaseId" })

         const getEmployee = await Employee.findById(empSaleId)
         if (!getEmployee) return res.status(404).json({ success: false, message: "Employee Not found" })

         const getEmployeeCase = await Case.findById(empSaleCaseId)
         if (!getEmployeeCase) return res.status(404).json({ success: false, message: "Employee case Not found" })


         const getClientCase = await Case.findById(clientCaseId)
         if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })

         if (getEmployeeCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getEmployeeCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
            return res.status(404).json({ success: false, message: "sale-employee and client must have same policyNo and emailId" })
         }

         const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
            {
               $set: {
                  empSaleId: getEmployee?._id?.toString(),
                  empSaleName: getEmployee?.fullName,
                  empSaleReferenceCaseDetails: {
                     referenceId: getEmployeeCase?._id?.toString(),
                     name: getEmployee?.fullName,
                     referenceDate: new Date(),
                     by: admin?.fullName
                  },
               }
            }, { new: true })
         await Case.findByIdAndUpdate(getEmployeeCase?._id, { $set: { isEmpSaleReferenceCase: true, } })
         return res.status(200).json({ success: true, message: "Successfully add case reference ", data: updateAndMergeCase });
      }

      return res.status(400).json({ success: true, message: "Failded to add case reference" });
   } catch (error) {
      console.log("adminAddRefenceCaseAndMarge in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminRemoveReferenceCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { type, _id } = req?.query

      if (!type) return res.status(400).json({ success: false, message: "Please select the type of reference to remove" })
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid CaseId" })

      if (type?.toLowerCase() == "partner") {
         const getClientCase = await Case.findById(_id)
         if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
         if (!validMongooseId(getClientCase?.partnerReferenceCaseDetails?.referenceId)) return res.status(400).json({ success: false, message: "Not a valid partner CaseId" })

         console.log(getClientCase?.partnerReferenceCaseDetails?.referenceId);
         const updatedPartnerCase = await Case.findByIdAndUpdate(getClientCase?.partnerReferenceCaseDetails?.referenceId, { $set: { isPartnerReferenceCase: false, } }, { new: true })
         if (!updatedPartnerCase) return res.status(404).json({ success: false, message: "Partner case is not found of the added reference case" })

         const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
            {
               $set: {
                  partnerId: "",
                  partnerName: "",
                  partnerReferenceCaseDetails: {},
               }
            }, { new: true })

         return res.status(200).json({ success: true, message: "Successfully remove partner reference case" })
      }
      if (type?.toLowerCase() == "sale-emp") {
         const getClientCase = await Case.findById(_id)
         if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
         if (!validMongooseId(getClientCase?.empSaleReferenceCaseDetails?.referenceId)) return res.status(400).json({ success: false, message: "Not a valid employee CaseId" })

         const updatedPartnerCase = await Case.findByIdAndUpdate(getClientCase?.empSaleReferenceCaseDetails?.referenceId, { $set: { isEmpSaleReferenceCase: false, } }, { new: true })
         if (!updatedPartnerCase) return res.status(404).json({ success: false, message: "Employee  case is not found of the added reference case" })

         const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
            {
               $set: {
                  empSaleId: "",
                  empSaleName: "",
                  empSaleReferenceCaseDetails: {},
               }
            }, { new: true })

         return res.status(200).json({ success: true, message: "Successfully remove employee reference case" })
      }

      return res.status(400).json({ success: false, message: "Not a valid type" })
   } catch (error) {
      console.log("adminRemoveRefenceCase in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminSetIsActiveCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, status } = req.query
      // console.log("emp",id,status);
      if (!_id || !status) return res.status(400).json({ success: false, message: "required case id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      // console.log("status",status);
      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      // console.log("update",updateCase);

      return res.status(200).json({ success: true, message: `Now case ${updateCase?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("adminSetIsActiveEmployee in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }

}


export const adminDeleteCaseById = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { caseId, docId } = req?.query
      if (!caseId || !docId) return res.status(400).json({ success: false, message: "caseId and docId are required" })
      if (!validMongooseId(caseId) || !validMongooseId(docId)) return res.status(400).json({ success: false, message: "Not a valid caseId or docId" })

      const getCase = await Case.findById(caseId);
      if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })

      const filterDocs = getCase?.caseDocs?.filter(doc => doc?._id == docId)?.[0]
      if (filterDocs && filterDocs?.docURL) {
         const setAdminHeaders = {
            "x-auth-token": req?.headers["x-auth-token"]
         };

         const requestBody = {
            files: [filterDocs?.docURL]
         };

         const docRes = await axios.delete(
            `${process.env.STORAGE_URL}/api/storage/deleteSelectedFiles`,
            {
               headers: setAdminHeaders,
               data: requestBody
            }
         );
         console.log("docRes", docRes?.data);
      }


      const updateCase = await Case.findByIdAndUpdate(caseId, { $pull: { caseDocs: { _id: docId } } }, { new: true })

      return res.status(200).json({ success: true, message: "Successfully case deleted" });
   } catch (error) {
      console.log("adminDeleteCaseDocById in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminDeletePartnerById = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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

export const adminDeleteClientById = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
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


export const adminUpdateModalSchema = async (req, res) => {
   try {
      const updateSchema = await Case.updateMany({ $or: [{ isEmpSaleReferenceCase: { $exists: false } }, { isPartnerReferenceCase: { $exists: false } }] },
         { $set: { isEmpSaleReferenceCase: false, isPartnerReferenceCase: false } },)

      res.status(200).json({ success: true, message: "Schema modal updated", });
   } catch (error) {
      console.log("adminUpdateModalSchema in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

//  for download data in excel
export const adminDownloadAllCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      // query = ?statusType=&search=&limit=&pageNo
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const getAllCase = await Case.find(query?.query).sort({ createdAt: -1 });

      const excelBuffer = await getDownloadCaseExcel(getAllCase)
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const getAllPartner = await Partner.find(query.query).select("-password").sort({ createdAt: -1 });

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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
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

export const adminEmpSaleReportDownload = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      if (empSale.type?.toLowerCase() != "sales") return res.status(404).json({ success: false, message: "Employee designation is not sale" })
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type, empSaleId)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })

      const getAllCase = await Case.find(query?.query).sort({ createdAt: -1 });
      const excelBuffer = await getDownloadCaseExcel(getAllCase)
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      if (empSale.type?.toLowerCase() != "sales") return res.status(404).json({ success: false, message: "Employee designation is not sale" })

      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllPartnerSearchQuery(searchQuery, type, empSaleId, startDate, endDate)
      if (!query.success) return res.status(400).json({ success: false, message: query?.message })
      const getAllPartner = await Partner.find(query?.query).select("-password").sort({ createdAt: -1 });
      // Generate Excel buffer
      const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner,true);

      res.setHeader('Content-Disposition', 'attachment; filename="partners.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)

   } catch (error) {
      console.log("viewAllPartnerByAdmin in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminAllClientDownload = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const searchQuery = req.query.search ? req.query.search : "";
      const type = req.query.type ? req.query.type : true
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const query = getAllClientSearchQuery(searchQuery, type,startDate,endDate)
      if(!query?.success) return res.status(400).json({success:false,message:query.message})
      const getAllClient = await Client.find(query.query).select("-password").sort({ createdAt: -1 });
      // Generate Excel buffer
      const excelBuffer = await getAllClientDownloadExcel(getAllClient);

      res.setHeader('Content-Disposition', 'attachment; filename="clients.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)
   } catch (error) {
      console.log("adminAllClientDownload in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}
