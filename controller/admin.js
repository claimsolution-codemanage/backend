import Admin from "../models/admin.js";
import {
   validateAdminSignUp, validateAdminSignIn, validateAdminResetPassword, validateUpdateAdminCase,
   validateAdminSettingDetails, validateAdminAddCaseFee, validateAdminUpdateCasePayment, validateAdminAddEmployeeToCase,
   validateEditAdminCaseStatus,validateAdminSharePartner,validateAdminRemovePartner,
} from "../utils/validateAdmin.js";
import bcrypt from 'bcrypt';
import { generatePassword, getAllCaseDocQuery, getAllInvoiceQuery, getAllSathiDownloadExcel, getEmployeeByIdQuery, getValidateDate } from "../utils/helper.js";
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
import { firebaseUpload } from "../utils/helper.js";
import { validateInvoice } from "../utils/validateEmployee.js";
import Bill from "../models/bill.js";
import { bucket } from "../index.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import CaseComment from "../models/caseComment.js";

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
         res.status(200).json({ success: true, message: "Credentials send"});
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

      const existEmployee = await Employee.find({ $or:[{email: { $regex:req.body.email, $options: "i" } },{ empId: { $regex:req.body.empId, $options: "i" } }] })
      if (existEmployee.length > 0) return res.status(401).json({ success: false, message: "Employee account/empId already exists" })

      const systemPassword = generatePassword()
      const bcryptPassword = await bcrypt.hash(systemPassword, 10)
      const newEmployee = new Employee({
         fullName: req?.body?.fullName?.trim(),
         empId:req.body?.empId?.trim(),
         branchId:req?.body?.branchId?.trim(),
         email: req?.body?.email?.trim()?.toLowerCase(),
         mobileNo: req?.body?.mobileNo,
         password: bcryptPassword,
         type: req?.body?.type ? req?.body?.type : "assistant",
         designation:req?.body?.designation ? req?.body?.designation : "executive"
      })
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

export const adminEmployeeProfile = async (req,res)=>{
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const {_id} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({status:false,message:"Not a valid Id"})

      const getEmp = await Employee.findById(_id).select("-password")
      if(!getEmp) return res.status(400).json({success:false,message:"Employee account not found"})
      
      return res.status(200).json({success:true,data:getEmp})

   } catch (error) {
      console.log("adminEmployeeProfile in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
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
            fullName: req?.body?.fullName,
            type: req?.body?.type,
            branchId:req.body?.branchId?.trim(),
            designation: req?.body?.designation?.trim(),
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
      const type = req.query.type ? req.query.type : true;
      const empType = req.query?.empType ? req.query?.empType :false

      const query = getAllEmployeeSearchQuery(searchQuery,type,empType)
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("referEmpId","fullName type designation");
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminDownloadAllEmployee = async (req, res) => {
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
      const type = req.query.type ? req.query.type : true;
      const empType = req.query?.empType ? req.query?.empType :false

      const query = getAllEmployeeSearchQuery(searchQuery,type,empType)
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("referEmpId","fullName type designation");
      const excelBuffer = await getAllSathiDownloadExcel(JSON.parse(JSON.stringify(getAllEmployee)),"");
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

      const excludedTypes = ["Sales", "Operation", "Finance","Sathi Team","Branch"];
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

      const updateCase = await Case.findByIdAndUpdate(req.body._id, {currentStatus: req.body.status }, { new: true })
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })

      const addNewStatus = new CaseStatus({
         remark:req.body.remark,
         status:req.body.status,
         consultant:admin?.fullName,
         adminId:req?.user?._id,
         caseId:req.body._id
      })
      await addNewStatus.save()
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
            ...(req.body.isCurrentStatus ? { currentStatus: req.body.status } : {}),
         }
      },
         {new: true},)
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })
      const updateStatus = await CaseStatus.findByIdAndUpdate( req.body?.processId,{
         $set:{
            status:req.body.status,
            remark:req.body.remark,
            consultant:admin?.fullName,
            adminId:req?.user?._id
         }
      } )
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
      const isReject = req?.query?.isReject=="true" ? {$in:["Reject"]} : {$nin:["Reject"]}

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type,false,false,isReject)
      // if (!query.success) return res.status(400).json({ success: false, message: query.message })
      // console.log("query", query?.query);

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
               { isActive: Boolean(req.query.type == "true" ? true :false) },
               req?.query?.isReject=="true" ? {currentStatus:{$in:["Reject"]}} : {currentStatus:{$nin:["Reject"]}},
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
                  }}
              ],
              as: 'partnerDetails'
            }
          },
          {'$unwind':{
            'path':'$partnerDetails',
            'preserveNullAndEmptyArrays':true
          }},
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
                    designation:1,
                    type:1
                  }}
              ],
              as: 'employeeDetails'
            }
          },
          {'$unwind':{
            'path':'$employeeDetails',
            'preserveNullAndEmptyArrays':true
          }},
          {'$match':{
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
          }},
          {'$sort':{'createdAt':-1}},
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
       

      // const aggregationPipeline = [
      //    { $match: query?.query }, // Match the documents based on the query
      //    {
      //       $group: {
      //          _id: null,
      //          totalAmtSum: { $sum: "$claimAmount" } // Calculate the sum of totalAmt
      //       }
      //    }
      // ];
      // console.log("query", query);

      // const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
      // const noOfCase = await Case.find(query?.query).count()
      
      // const aggregateResult = await Case.aggregate(aggregationPipeline);

      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase, totalAmt: totalAmount });

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
               { partnerId:  req.query.partnerId },
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
                  }}
              ],
              as: 'partnerDetails'
            }
          },
          {'$unwind':{
            'path':'$partnerDetails',
            'preserveNullAndEmptyArrays':true
          }},
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
                    designation:1,
                    type:1
                  }}
              ],
              as: 'employeeDetails'
            }
          },
          {'$unwind':{
            'path':'$employeeDetails',
            'preserveNullAndEmptyArrays':true
          }},
          {'$match':{
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
          }},
          {'$sort':{'createdAt':-1}},
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
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
         const excludedTypes = ["sales", "operation", "finance","sathi team","branch"];
         const isNormalEmp = !excludedTypes.includes(empSale?.type?.toLowerCase())
         let empBranchId =false
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
   
            if(isNormalEmp && empSale?._id){
               matchQuery.push({ addEmployee: { $in: empSale?._id?.toString() } })
            }
   
         } else {
   
            let extactMatchQuery = [
               { referEmpId: empSale?._id },
               { _id: empSale?._id }
            ]
   
            if(empSale?.type?.toLowerCase()=="sales" && empSale?.designation?.toLowerCase()=="manager"){
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
   
            matchQuery.push(                  {
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
                        }}
                    ],
                    as: 'partnerDetails'
                  }
                },
                {'$unwind':{
                  'path':'$partnerDetails',
                  'preserveNullAndEmptyArrays':true
                }},
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
                          designation:1,
                          type:1
                        }}
                    ],
                    as: 'employeeDetails'
                  }
                },
                {'$unwind':{
                  'path':'$employeeDetails',
                  'preserveNullAndEmptyArrays':true
                }},
                {'$match':{
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
                }},
                {'$sort':{'createdAt':-1}},
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
   return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase,totalAmt: totalAmount  });

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


      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const caseAccess = ["operation", "finance", "branch"]

      if (caseAccess?.includes(empSale?.type?.toLowerCase())) {
         const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate,empSale?.branchId)
         if (!query.success) return res.status(400).json({ success: false, message: query?.message })
         const getAllPartner = await Partner.find(query?.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId","fullName type designation");
         const noOfPartner = await Partner.find(query?.query).count()
         return res.status(200).json({ success: true, message: "get partner data", data: getAllPartner, noOfPartner: noOfPartner });
   
      } else {
         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if((empSale?.type?.toLowerCase()=="sales" && empSale?.designation?.toLowerCase()=="manager")){
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
                  shareEmpId:1,
                  _id: 0,
               }
            },
            {
               $project: {
                  shareEmpId:1,
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

      console.log("extractType----",extractType);

         let query = {
            $and: [
               { isActive: true },
               { branchId: { $regex: empSale?.branchId, $options: "i" } },
               {
                  $or: [
                     { salesId : { $in: extractType?.[0]?.shareEmpId } },
                     { shareEmployee : { $in: extractType?.[0]?.shareEmp } },
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
         const getAllPartner = await Partner.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId","fullName type designation");
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })



      const { _id } = req.query;
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getCase = await Case.findById(_id).select("-caseDocs -processSteps -addEmployee -caseCommit")
      if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })
      const getCaseDoc = await CaseDoc.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId")
      const getCaseStatus = await CaseStatus.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId")
      const getCaseComment = await CaseComment.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true })
      const getCaseJson = getCase.toObject()
      getCaseJson.caseDocs = getCaseDoc
      getCaseJson.processSteps = getCaseStatus
      getCaseJson.caseCommit = getCaseComment

      return res.status(200).json({ success: true, message: "get case data", data: getCaseJson });

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
      const getAllPartner = await Partner.find(query.query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("salesId","fullName type designation");
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
            "profile.kycPhoto":req?.body?.kycPhoto,
            "profile.kycAadhaar":req?.body?.kycAadhaar,
            "profile.kycAadhaarBack": req?.body?.kycAadhaarBack,
            "profile.kycPan":req?.body?.kycPan
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
            "profile.kycPhoto":req?.body?.kycPhoto,
            "profile.kycAadhaar":req?.body?.kycAadhaar,
            "profile.kycAadhaarBack": req?.body?.kycAadhaarBack,
            "profile.kycPan":req?.body?.kycPan
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

      
      const newDoc = req?.body?.caseDocs?.filter(doc=>doc?.new)
      const oldDoc = req?.body?.caseDocs?.filter(doc=>!doc?.new)

      // req.body.caseDocs = req?.body?.caseDocs?.map(caseFile => {
      //    return {
      //       docDate: caseFile?.docDate ? caseFile?.docDate : new Date(),
      //       docName: caseFile?.docName,
      //       docType: caseFile?.docFormat,
      //       docFormat: caseFile?.docFormat,
      //       docURL: caseFile?.docURL,
      //    }
      // })

      // console.log("case_id", _id, req.body);

      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body,caseDocs:oldDoc } }, { new: true })
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

      const updatePartners = req.body?.sharePartners?.map(async(casePartners) =>{
         const getPartner = await Partner.findById(casePartners)
         if(getPartner){
            const filterShareEmp =  req.body.shareEmployee.filter(empId => !getPartner?.shareEmployee?.includes(empId));
            return Partner.findByIdAndUpdate(casePartners, { $push: { shareEmployee: { $each: filterShareEmp } } }, { new: true })
         }
      }


         )
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

export const adminRemovePartnerToSaleEmp = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const {_id} = req?.query
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


export const adminAddCaseComment = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      if (!req?.body?.Comment) return res.status(400).json({ success: false, message: "Case Comment required" })
      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const getCase = await Case.findById(req.body._id,)
      if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

      const newComment = new CaseComment({
         role:req?.user?.role,
         name:req?.user?.fullName,
         type:req?.user?.empType,
         message:req?.body?.Comment,
         caseId:getCase?._id?.toString(),
         adminId:req?.user?._id,
      })
      await newComment.save()

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
         if(getPartnerCase?.branchId?.toLowerCase()!=getClientCase?.branchId?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

         if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })
         console.log(getPartnerCase?.policyNo?.toLowerCase(), getClientCase?.policyNo?.toLowerCase(), getPartnerCase?.email?.toLowerCase(), getClientCase?.email?.toLowerCase());

         if (getPartnerCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getPartnerCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
            return res.status(404).json({ success: false, message: "Partner and client must have same policyNo and emailId" })
         }

         if (getClientCase?.partnerReferenceCaseDetails?._id) {
            return res.status(404).json({ success: false, message: "Case already have the partner case reference" })
         }

         let mergeParmeter = {
            partnerId: getPartner?._id?.toString(),
            partnerName: getPartner?.profile?.consultantName,
            partnerCode:getPartner?.profile?.consultantCode,
            partnerReferenceCaseDetails: {
               referenceId: getPartnerCase?._id?.toString(),
               name: getPartner?.profile?.consultantName,
               consultantCode:getPartner?.profile?.consultantCode,
               referenceDate: new Date(),
               by: admin?.fullName
            },
         }

         if(getPartnerCase?.empSaleId && getPartnerCase?.empSaleName){
            mergeParmeter["empSaleId"] = getPartnerCase?.empSaleId
            mergeParmeter["empSaleName"] = getPartnerCase?.empSaleName
         }

         const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
            {
               $set: {
                  ...mergeParmeter
                  // partnerId: getPartner?._id?.toString(),
                  // partnerName: getPartner?.profile?.consultantName,
                  // partnerCode:getPartner?.profile?.consultantCode,
                  // empSaleId: getPartnerCase?.empSaleId || "",
                  // empSaleName: getPartnerCase?.empSaleName || "",
                  // partnerReferenceCaseDetails: {
                  //    referenceId: getPartnerCase?._id?.toString(),
                  //    name: getPartner?.profile?.consultantName,
                  //    consultantCode:getPartner?.profile?.consultantCode,
                  //    referenceDate: new Date(),
                  //    by: admin?.fullName
                  // },
               }
            }, { new: true })
         await Case.findByIdAndUpdate(getPartnerCase?._id, { $set: { isPartnerReferenceCase: true, } })
         const doc = await CaseDoc.updateMany({caseId:partnerCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
         const status = await CaseStatus.updateMany({caseId:partnerCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
         const comment = await CaseComment.updateMany({caseId:partnerCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
         return res.status(200).json({ success: true, message: "Successfully add partner case reference ", data: updateAndMergeCase,doc,status,comment,partnerCaseId,clientCaseId });
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

            if(getEmployeeCase?.branchId?.toLowerCase()!=getClientCase?.branchId?.toLowerCase()) return res.status(404).json({ success: false, message: "Case must be from same branch" })

         if (getEmployeeCase?.policyNo?.toLowerCase() != getClientCase?.policyNo?.toLowerCase() || getEmployeeCase?.email?.toLowerCase() != getClientCase?.email?.toLowerCase()) {
            return res.status(404).json({ success: false, message: "sale-employee and client must have same policyNo and emailId" })
         }

         let empMergeParmeter = {
            empSaleId: getEmployee?._id?.toString(),
            empSaleName: `${getEmployee?.fullName} | ${getEmployee?.type} | ${getEmployee?.designation}`,
            empId:getEmployee?.empId,
            empSaleReferenceCaseDetails: {
               referenceId: getEmployeeCase?._id?.toString(),
               name: getEmployee?.fullName,
               empId:getEmployee?.empId,
               referenceDate: new Date(),
               by: admin?.fullName
            },
         }

         if(getEmployeeCase?.partnerId && getEmployeeCase?.partnerName){
            empMergeParmeter["partnerId"] = getEmployeeCase?.partnerId
            empMergeParmeter["partnerName"] = getEmployeeCase?.partnerName
            empMergeParmeter["partnerCode"] = getEmployeeCase?.partnerCode || ""
         }

         const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
            {
               $set: {
                  ...empMergeParmeter
                  // empSaleId: getEmployee?._id?.toString(),
                  // empSaleName:`${getEmployee?.fullName} | ${getEmployee?.type} | ${getEmployee?.designation}`,
                  // empId:getEmployee?.empId,
                  // partnerId: getEmployeeCase?.partnerId || "",
                  // partnerName: getEmployeeCase?.partnerName || "",
                  // partnerCode:getEmployeeCase?.partnerCode || "",
                  // empSaleReferenceCaseDetails: {
                  //    referenceId: getEmployeeCase?._id?.toString(),
                  //    name: getEmployee?.fullName,
                  //    empId:getEmployee?.empId,
                  //    referenceDate: new Date(),
                  //    by: admin?.fullName
                  // },
               }
            }, { new: true })
         await Case.findByIdAndUpdate(getEmployeeCase?._id, { $set: { isEmpSaleReferenceCase: true, } })
         await CaseDoc.updateMany({caseId:empSaleCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
         await CaseStatus.updateMany({caseId:empSaleCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
         await CaseComment.updateMany({caseId:empSaleCaseId},{$set:{caseMargeId:clientCaseId,isMarge:true}},{new:true})
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
                  partnerCode:"",
                  partnerReferenceCaseDetails: {},
               }
            }, { new: true })
            await CaseDoc.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
            await CaseStatus.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
            await CaseComment.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})

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
                  empId:"",
                  empSaleReferenceCaseDetails: {},
               }
            }, { new: true })
            await CaseDoc.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
            await CaseStatus.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})
            await CaseComment.updateMany({caseMargeId:_id},{$set:{caseMargeId:"",isMarge:false}})

         return res.status(200).json({ success: true, message: "Successfully remove employee reference case" })
      }

      return res.status(400).json({ success: false, message: "Not a valid type" })
   } catch (error) {
      console.log("adminRemoveRefenceCase in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminUnactiveCaseDoc = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const { _id, status } = req?.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid docId" })

      const updateDoc = await CaseDoc.findByIdAndUpdate(_id,{$set:{isActive:status}})
      if(!updateDoc) return res.status(404).json({ success: false, message: "Case-doc not found" })

      return res.status(200).json({ success: true, message: `Successfully ${!status ? "restore":"remove"} case-doc` })
   } catch (error) {
      console.log("adminRemoveRefenceCase in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}


export const adminAllUnactiveCaseDoc = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      
      const query = getAllCaseDocQuery(searchQuery, startDate, endDate,)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })

      const getAllCaseDoc = await CaseDoc.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("caseId");
      const noOfCaseDoc = await CaseDoc.find(query?.query).count()

      return res.status(200).json({ success: true  , message: `Successfully fetch case-doc`,data:getAllCaseDoc,totalDoc:noOfCaseDoc })
   } catch (error) {
      console.log("adminAllUnactiveCaseDoc in error:", error);
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


      const { _id } = req?.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid  docId" })

      const getCase = await CaseDoc.findById(_id);
      if (!getCase) return res.status(404).json({ success: false, message: "Case-doc not found" })

      const docUrl = getCase?.url?.toString()
      if (docUrl) {
         if(docUrl?.includes("https://firebasestorage.googleapis.com/")){
            const parts = docUrl.split('/');
            const encodedFilename = parts[parts.length - 1];
            const endParts = encodedFilename?.split("?")?.[0]
            const decodedFilename = decodeURIComponent(endParts);
            if(decodedFilename){
               const file = bucket.file(decodedFilename);
               await file.delete()
            } 
          
         }else{
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

export const adminAddPartnerRefToEmp = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const { partnerId,empEmail } = req?.body
      if (!partnerId) return res.status(400).json({ success: false, message: "Partner id required" })
      if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid PartnerId" })

      if (!empEmail) return res.status(400).json({ success: false, message: "Employee email is required" })

      const findPartner = await Partner.findById(partnerId)   
      if (!findPartner) return res.status(404).json({ success: false, message: "Parnter not found" })
      if(findPartner.salesId) return res.status(404).json({ success: false, message: "Reference already added" })

      const findEmp = await Employee.findOne({email:{ $regex: empEmail, $options: "i" }})
      if(!findEmp) return res.status(404).json({ success: false, message: "Employee not found" })

      const updatePartner = await Partner.findByIdAndUpdate(partnerId,{salesId:findEmp._id})
      return res.status(200).json({ success: true, message: "Successfully add employee reference" });

   } catch (error) {
      console.log("adminAddPartnerRefToEmp in error:", error);
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
      const isReject = req?.query?.isReject=="true" ? {$in:["Reject"]} : {$nin:["Reject"]}
      

      // const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, false, false, type,false,false,isReject)
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
               { isActive: Boolean(req.query.type == "true" ? true :false) },
               req?.query?.isReject=="true" ? {currentStatus:{$in:["Reject"]}} : {currentStatus:{$nin:["Reject"]}},
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
                  }}
              ],
              as: 'partnerDetails'
            }
          },
          {'$unwind':{
            'path':'$partnerDetails',
            'preserveNullAndEmptyArrays':true
          }},
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
                    designation:1,
                    type:1
                  }}
              ],
              as: 'employeeDetails'
            }
          },
          {'$unwind':{
            'path':'$employeeDetails',
            'preserveNullAndEmptyArrays':true
          }},
          {'$match':{
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
          }},
          {'$sort':{'createdAt':-1}},
       ];
       
       const result = await Case.aggregate(pipeline);

      const excelBuffer = await getDownloadCaseExcel(result)
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
      const getAllPartner = await Partner.find(query.query).select("-password").sort({ createdAt: -1 }).populate("salesId","fullName type designation");

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
               { partnerId:  req.query.partnerId },
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
                  }}
              ],
              as: 'partnerDetails'
            }
          },
          {'$unwind':{
            'path':'$partnerDetails',
            'preserveNullAndEmptyArrays':true
          }},
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
                    designation:1,
                    type:1
                  }}
              ],
              as: 'employeeDetails'
            }
          },
          {'$unwind':{
            'path':'$employeeDetails',
            'preserveNullAndEmptyArrays':true
          }},
          {'$match':{
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
          }},
          {'$sort':{'createdAt':-1}},
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
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
      const { empSaleId } = req.query
      if (!validMongooseId(empSaleId)) return res.status(400).json({ success: false, message: "Not a valid salesId" })
      const empSale = await Employee.findById(empSaleId).select("-password")
      if (!empSale) return res.status(404).json({ success: false, message: "Employee not found" })
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true
      const excludedTypes = ["sales", "operation", "finance","sathi team","branch"];
      const isNormalEmp = !excludedTypes.includes(empSale?.type?.toLowerCase())
      let empBranchId =false
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

         if(isNormalEmp && empSale?._id){
            matchQuery.push({ addEmployee: { $in: empSale?._id?.toString() } })
         }

      } else {

         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if(empSale?.type?.toLowerCase()=="sales" && empSale?.designation?.toLowerCase()=="manager"){
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

         matchQuery.push(                  {
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
                     }}
                 ],
                 as: 'partnerDetails'
               }
             },
             {'$unwind':{
               'path':'$partnerDetails',
               'preserveNullAndEmptyArrays':true
             }},
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
                       designation:1,
                       type:1
                     }}
                 ],
                 as: 'employeeDetails'
               }
             },
             {'$unwind':{
               'path':'$employeeDetails',
               'preserveNullAndEmptyArrays':true
             }},
             {'$match':{
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
             }},
             {'$sort':{'createdAt':-1}},
      
          ];
          
          const result = await Case.aggregate(pipeline);
          const excelBuffer = await getDownloadCaseExcel(result,empSale?._id?.toString())
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
 
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";

      const caseAccess = ["operation", "finance", "branch"]

      if (caseAccess?.includes(empSale?.type?.toLowerCase())) {
         const query = getAllPartnerSearchQuery(searchQuery, type, false, startDate, endDate,empSale?.branchId)
         if (!query.success) return res.status(400).json({ success: false, message: query?.message })
         const getAllPartner = await Partner.find(query?.query).populate("salesId","fullName type designation");
         const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner,empSale?._id?.toString());

         res.setHeader('Content-Disposition', 'attachment; filename="partners.xlsx"')
         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
         res.status(200)
         res.send(excelBuffer)
      } else {
         let extactMatchQuery = [
            { referEmpId: empSale?._id },
            { _id: empSale?._id }
         ]

         if((empSale?.type?.toLowerCase()=="sales" && empSale?.designation?.toLowerCase()=="manager")){
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
                  shareEmpId:1,
                  _id: 0,
               }
            },
            {
               $project: {
                  shareEmpId:1,
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
                     { salesId : { $in: extractType?.[0]?.shareEmpId } },
                     { shareEmployee : { $in: extractType?.[0]?.shareEmp } },
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
         const getAllPartner = await Partner.find(query).populate("salesId","fullName type designation");
         const excelBuffer = await getAllPartnerDownloadExcel(getAllPartner,empSale?._id?.toString());

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


export const adminCreateInvoice = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })
   
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
      const newInvoice = new Bill({...req.body,branchId:getCase?.branchId,caseId,clientId,invoiceNo:`ACS-${billCount+1}`})
      newInvoice.save()
      return  res.status(200).json({success: true, message: "Successfully create invoice",_id:newInvoice?._id});
   } catch (error) {
      console.log("admin-create invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}


export const adminViewAllInvoice = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

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
      console.log("admin-get invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const adminViewInvoiceById = async(req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      
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


export const adminEditInvoice = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

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
      console.log("admin-create invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const adminPaidInvoice = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const {_id} = req.body;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const { remark } = req.body
      if (!remark) return res.status(400).json({ success: false, message: "Remark is required" })

      const getInvoice = await Bill.findById(_id)
      if(!getInvoice?.isPaid){
         const invoice = await Bill.findByIdAndUpdate(_id,{$set:{remark:remark,isPaid:true,paidBy:"admin",paidDate: new Date()}}) 
         return  res.status(200).json({success: true, message: "Successfully paid invoice"});
      }else{
         return  res.status(400).json({success: true, message: "Invoice already paid"});
      }


   } catch (error) {
      console.log("admin-Paid-Invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const adminUnActiveInvoice = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const {_id,type} = req.query;
      console.log("type1",type);
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const invoice = await Bill.findByIdAndUpdate(_id,{$set:{isActive: type}}) 

      return  res.status(200).json({success: true, message: `Successfully ${type?  "restore" : "remove"} invoice`});
   } catch (error) {
      console.log("admin-remove invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const adminRemoveInvoice = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const {_id,type} = req.query;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})

      const invoice = await Bill.findByIdAndDelete(_id) 

      return  res.status(200).json({success: true, message: `Successfully delete invoice`});
   } catch (error) {
      console.log("admin-delete invoice in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const adminChangeBranch = async (req,res)=>{
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const {_id,branchId,type} = req.body;
      if(!validMongooseId(_id)) return res.status(400).json({success: false, message:"Not a valid id"})
      if(!branchId || !type)  return res.status(400).json({success: false, message:"Required BranchId and type"})

      if(type?.toLowerCase()=="client"){
         const getClient = await Client?.findById(_id)
         if(!getClient) return res.status(400).json({success: false, message:"Client account not found"})
         
         await Client.findByIdAndUpdate(_id,{branchId:branchId?.trim()})
         await Case.updateMany({clientId:_id},{branchId:branchId?.trim()})
         await Bill.updateMany({clientId:_id},{branchId:branchId?.trim()})
      return  res.status(200).json({success: true, message: `Successfully Change Branch`});
      }else {
         const getPartner = await Partner?.findById(_id)
         if(!getPartner) return res.status(400).json({success: false, message:"Partner account not found"})
         
         await Partner.findByIdAndUpdate(_id,{branchId:branchId?.trim()})
         await Case.updateMany({partnerId:_id},{branchId:branchId?.trim()})
         return  res.status(200).json({success: true, message: `Successfully Change Branch`});
      }

   } catch (error) {
      console.log("adminChangeBranch in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

export const adminViewEmpSathiEmployee = async (req, res) => {
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })

      const searchQuery = req.query.search ? req.query.search : "";
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const empId = req.query.empId 

      if(!validMongooseId(empId)) return res.status(400).json({success:false,message:"Not a valid Id"})
      const getEmp = await Employee.findById(empId)
      if(!getEmp) return res.status(400).json({success:false,message:"Employee not found"})

      const caseAccess = ["operation", "finance", "branch"]
      let query = {}
      console.log(caseAccess?.includes(getEmp?.type?.toLowerCase()),"----");
      if (caseAccess?.includes(getEmp?.type?.toLowerCase())) {
       query = getEmployeeByIdQuery(searchQuery,"sathi team",getEmp?.branchId)
      }else{
         query = {
            $and:[
               {isActive:true},
               getEmp?.designation?.toLowerCase()=="executive" ? { referEmpId : getEmp?._id } : {},
               {branchId:{ $regex:getEmp?.branchId, $options: "i" }},
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
   
      const getAllEmployee = await Employee.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).populate("referEmpId","fullName type designation");
      const noOfEmployee = await Employee.find(query).count()
      return res.status(200).json({ success: true, message: "get employee data", data: getAllEmployee, noOfEmployee: noOfEmployee });

   } catch (error) {
      console.log("adminViewAllEmployee in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const adminDownloadEmpSathiEmployee = async (req, res) => {
   try {
      const verify =  await authAdmin(req,res)
      if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: "Admin account not active" })


      const searchQuery = req.query.search ? req.query.search : "";
      const empId = req.query.empId 

      if(!validMongooseId(empId)) return res.status(400).json({success:false,message:"Not a valid Id"})
      const getEmp = await Employee.findById(empId)
      if(!getEmp) return res.status(400).json({success:false,message:"Employee not found"})

      const caseAccess = ["operation", "finance", "branch"]
      let query = {}
      console.log(caseAccess?.includes(getEmp?.type?.toLowerCase()),"----");
      if (caseAccess?.includes(getEmp?.type?.toLowerCase())) {
       query = getEmployeeByIdQuery(searchQuery,"sathi team",getEmp?.branchId)
      }else{
         query = {
            $and:[
               {isActive:true},
               getEmp?.designation?.toLowerCase()=="executive" ? { referEmpId : getEmp?._id } : {},
               {branchId:{ $regex:getEmp?.branchId, $options: "i" }},
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
   
      const getAllEmployee = await Employee.find(query).select("-password").sort({ createdAt: -1 }).populate("referEmpId","fullName type designation");
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

export const adminSyncModal = async(req,res)=>{
   try {
      const getAllCase = await Case.find({})
      const superAdmin = await Admin.find({email:process.env.ADMIN_MAIL_ID})
      
      await Promise.all(getAllCase?.map(async(myCase)=>{
        await Promise.all( myCase?.caseDocs?.map(async(doc)=>{
            const newCaseDoc = new CaseDoc({
               name:doc?.docName,
               type:doc?.docType,
               format:doc?.docFormat,
               url:doc?.docURL,
               docDate:doc?.docDate,
               caseId:myCase?._id?.toString(),
               adminId:superAdmin?.[0]?._id
            })
            return newCaseDoc.save()
        }))

        await Promise.all(myCase?.processSteps?.map(async(status)=>{
         const newCaseStatus = new CaseStatus({
            status:status?.status,
            remark:status?.remark,
            consultant:status?.consultant,
            caseId:myCase?._id?.toString(),
            date:status?.date,
            adminId:superAdmin?.[0]?._id
         })
         return newCaseStatus.save()
        }))

        await Promise.all(myCase?.caseCommit?.map(async(comment)=>{
         const newCaseComment = new CaseComment({
            name:comment?.name,
            role:comment?.role,
            type:comment?.type,
            message:comment?.commit,
            caseId:myCase?._id?.toString(),
            date:comment?.Date,
            adminId:superAdmin?.[0]?._id
         })
         return newCaseComment.save()
        }))
      }))
      
      return res.status(200).json({success:true,message:"Modal created successfully"});
   } catch (error) {
      console.log("adminSyncModal in error:",error);
      return res.status(500).json({success:false,message:"Internal server error",error:error});
   }
}

