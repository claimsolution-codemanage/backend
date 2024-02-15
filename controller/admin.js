import Admin from "../models/admin.js";
import {
   validateAdminSignUp, validateAdminSignIn, validateAdminResetPassword, validateUpdateAdminCase,
   validateAdminSettingDetails, validateAdminAddCaseFee, validateAdminUpdateCasePayment, validateAdminAddEmployeeToCase,
   validateEditAdminCaseStatus
} from "../utils/validateAdmin.js";
import bcrypt from 'bcrypt';
import { generatePassword } from "../utils/helper.js";
import { sendAdminSigninMail, sendEmployeeSigninMail, sendForgetPasswordMail } from "../utils/sendMail.js";
import { authAdmin } from "../middleware/authentication.js";
import Employee from "../models/employee.js";
import { validateEmployeeSignUp } from "../utils/validateEmployee.js";
import { validMongooseId } from "../utils/helper.js";
import Case from "../models/case.js";
import { getAllPartnerSearchQuery, getAllClientSearchQuery, getAllCaseQuery, getAllEmployeeSearchQuery } from "../utils/helper.js";
import Partner from "../models/partner.js";
import Client from '../models/client.js'
import { validateAddClientCase } from "../utils/validateClient.js";
import { trusted } from "mongoose";
import Jwt from 'jsonwebtoken'
import { validateResetPassword } from "../utils/helper.js";
import jwtDecode from "jwt-decode";


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

      if(!admin[0]?.isActive) return res.status(404).json({ success: false, message: "Admin account not active" })

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
            }
         },
         {
            '$group': {
               '_id': '$currentStatus',
               'totalCases': {
                  '$sum': 1
               }
            }
         },
         {
            '$group': {
               '_id': null,
               'totalCase': {
                  '$sum': '$totalCases'
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
      return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData });
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
         type:req?.body?.type ? req?.body?.type : "assistant",
      })
      try {
         await sendEmployeeSigninMail(req.body.email, systemPassword);
         await newEmployee.save()
         return res.status(200).json({ success: true, message: "Successfully create new Employee", systemPassword: systemPassword });
      } catch (err) {
         console.log("send otp error", err);
         return res.status(400).json({ success: false, message: "Failed to send OTP" });
      }


   } catch (error) {
      console.log("createEmployeeAccount in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}

export const adminViewAllEmployee = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })
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

export const changeStatusAdminCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })

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
      console.log("query",query?.query);
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
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase,totalAmt:aggregateResult });

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
      if (!validMongooseId(req.query.partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
      const partner = await Partner.findById(req.query.partnerId).select("-password")
      if(!partner) return res.status(404).json({ success: false, message: "Parnter not found" })
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req.query.partnerId, false, false, type)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      console.log("query",query?.query);
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
      return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase,totalAmt:aggregateResult,user:partner });

   } catch (error) {
      console.log("updateAdminCase in error:", error);
      res.status(500).json({ success: false, message: "Internal server error", error: error });

   }
}


export const viewCaseByIdByAdmin = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })


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
      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req?.query?.type ? req.query.type : true;

      const query = getAllPartnerSearchQuery(searchQuery, type)
      const getAllPartner = await Partner.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfPartner = await Partner.find(query).count()
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

export const adminSetIsActivePartner = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })

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
      // query = ?statusType=&search=&limit=&pageNo
      const pageItemLimit = req.query.limit ? req.query.limit : 10;
      const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
      const searchQuery = req.query.search ? req.query.search : "";
      const type = req.query.type ? req.query.type : true
      console.log("type", type);

      const query = getAllClientSearchQuery(searchQuery, type)
      const getAllClient = await Client.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const noOfClient = await Client.find(query).count()
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

      const { _id } = req.query
      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      const mycase = await Case.find({ _id: _id })
      if (mycase.length == 0) return res.status(404).json({ success: false, message: "Case not found" })

      const { error } = validateAddClientCase(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

      req.body.caseDocs = req?.body?.caseDocs?.map(caseFile => {
         return {
            docDate: caseFile?.docDate ? caseFile?.docDate : new Date(),
            docName: caseFile?.docFormat,
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

export const adminAddCaseComment = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })

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

      const { partnerId, partnerCaseId, clientCaseId } = req?.query
      if (!partnerId || !partnerCaseId || !clientCaseId) return res.status(400).json({ success: false, message: "For add reference partnerId,partnerCaseId and ClientId are required" })
      if (!validMongooseId(partnerId)) return res.status(400).json({ success: false, message: "Not a valid partnerId" })
      if (!validMongooseId(partnerCaseId)) return res.status(400).json({ success: false, message: "Not a valid partnerCaseId" })
      if (!validMongooseId(clientCaseId)) return res.status(400).json({ success: false, message: "Not a valid clientCaseId" })

      const getPartner = await Partner.findById(partnerId)
      if (!getPartner) return res.status(404).json({ success: false, message: "Partner Not found" })

      const getClientCase = await Case.findById(clientCaseId)
      if (!getClientCase) return res.status(404).json({ success: false, message: "Client case Not found" })

      const getPartnerCase = await Case.findById(partnerCaseId)
      if (!getPartnerCase) return res.status(404).json({ success: false, message: "Partner case Not found" })


      const referenceCaseAllDocs = [...getPartnerCase?.caseDocs, ...getClientCase?.caseDocs]
      const referenceCaseAllProcess = [...getPartnerCase?.processSteps, ...getClientCase?.processSteps]


      const updateAndMergeCase = await Case.findByIdAndUpdate(getClientCase?._id,
         {
            $set: {
               partnerId: getPartner?._id,
               partnerName: getPartner?.fullName,
               isReferenceCase: true,
               referenceCaseDetails: {
                  partnerId: getPartner?._id,
                  name: getPartner?.fullName,
                  referenceDate: new Date(),
                  by: admin?.fullName
               },
               processSteps: referenceCaseAllProcess,
               caseDocs: referenceCaseAllDocs,
            }
         }, { new: true })


      await Case.findByIdAndDelete(getPartnerCase?._id)


      return res.status(200).json({ success: true, message: "Successfully add case reference ", data: updateAndMergeCase });
   } catch (error) {
      console.log("adminAddRefenceCaseAndMarge in error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error: error });
   }
}

export const adminSetIsActiveCase = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })

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

export const adminDeletePartnerById = async (req, res) => {
   try {
      const verify = await authAdmin(req, res)
      if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

      const admin = await Admin.findById(req?.user?._id)
      if (!admin) return res.status(401).json({ success: false, message: "Admin account not found" })

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

      const noofAdmin = await Admin.find(query).count()-1

      const allAdmins = await Admin.find(query).select("-password").skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
      const filterSuperAdmin = allAdmins.filter(admin=>admin?.email.toLowerCase()!==process?.env?.ADMIN_MAIL_ID?.toLowerCase())
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

      const { _id} = req.query
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