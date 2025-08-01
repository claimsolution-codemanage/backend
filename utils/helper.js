import mongoose from "mongoose";
import validateDate from "validate-date";
import Joi from "joi";
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fsAsync from 'fs/promises'
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
// import { bucket } from "../index.js";
import { bucket } from "../firebase/config.js";
import multer from "multer";
import {exec} from 'child_process'
import fs from 'fs'
import path from 'path'
import { commonSendMail, generateNotificationTemplate } from "./sendMail.js";
import Employee from "../models/employee.js";
import Notification from "../models/notification.js";
import Admin from "../models/admin.js";
import Client from "../models/client.js";
import Partner from "../models/partner.js";

const upload = multer({
  storage: multer.memoryStorage(),
});

export const validMongooseId = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
}

export const otp6Digit = () => {
  let randomChars = '0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  return result;
}

export const generatePassword = () => {
  const passwordValue = "qwertyuiopasdfghjklzxcvbnm!@#$%^&*ASDFGHJKLZXCVBNMQWERTYUIOP123456789"
  const passwordLength = 20
  let genratePass = ""
  for (let i = 0; i <= passwordLength; i++) {
    genratePass += `${passwordValue[Math.floor(Math.random() * passwordValue.length)]}`
  }
  return genratePass
}

export const getValidateDate = (date) => {
  return validateDate(date, "boolean", "yyyy/mm/dd");
}


export const getAllCaseQuery = (statusType, searchQuery, startDate, endDate, partnerId, clientId, employeeId, type = true, empSaleId = false,branchId=false,isReject=false) => {
 console.log("status-----",statusType,branchId,employeeId);
  if (startDate && endDate) {
    const validStartDate = getValidateDate(startDate)
    if (!validStartDate) return { success: false, message: "start date not formated" }
    const validEndDate = getValidateDate(endDate)
    if (!validEndDate) return { success: false, message: "end date not formated" }
  }

  let query = {
    $and: [
      // partnerId ? { partnerId: partnerId } : {},
      // clientId ? { clientId: clientId } : {},
      partnerId ? { partnerObjId: partnerId } : {},
      clientId ? { clientObjId: clientId } : {},
      !empSaleId && employeeId ? { addEmployee: { $in: employeeId } } : {},
      empSaleId ? { empSaleId: empSaleId } : {},
      { isPartnerReferenceCase: false },
      { isEmpSaleReferenceCase: false },
      isReject ? { currentStatus: isReject } :{} ,
      { currentStatus: { $regex: statusType, $options: "i" } },
      { isActive: type },
      branchId ?  { branchId: { $regex:branchId, $options: "i" }} : {},
      {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { partnerName: { $regex: searchQuery, $options: "i" } },
          { consultantCode: { $regex: searchQuery, $options: "i" } },
          { fileNo: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
          { mobileNo: { $regex: searchQuery, $options: "i" } },
          { policyType: { $regex: searchQuery, $options: "i" } },
          { caseFrom: { $regex: searchQuery, $options: "i" } },
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

  // console.log("my-query",query);
  return { success: true, query: query }
}

export const getAllCaseDocQuery = (searchQuery, startDate, endDate) => {
   if (startDate && endDate) {
     const validStartDate = getValidateDate(startDate)
     if (!validStartDate) return { success: false, message: "start date not formated" }
     const validEndDate = getValidateDate(endDate)
     if (!validEndDate) return { success: false, message: "end date not formated" }
   }
 
   let query = {
     $and: [
       { isActive: false },
       {
         $or: [
           { name: { $regex: searchQuery, $options: "i" } },
           { type: { $regex: searchQuery, $options: "i" } },
           { format: { $regex: searchQuery, $options: "i" } },
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
   return { success: true, query: query }
 }


export const getAllPartnerSearchQuery = (searchQuery, type, empSaleId = false, startDate = "", endDate = "",branchId=false) => {
  console.log("salesId", empSaleId, startDate, endDate,branchId);
  if (startDate && endDate) {
    const validStartDate = getValidateDate(startDate)
    if (!validStartDate) return { success: false, message: "start date not formated" }
    const validEndDate = getValidateDate(endDate)
    if (!validEndDate) return { success: false, message: "end date not formated" }
  }
  let query = {
    $and: [
      empSaleId ? { shareEmployee: { $in: empSaleId } } : {},
      { isActive: type },
      branchId ?  { branchId: { $regex:branchId, $options: "i" }} : {},
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
  return { success: true, query: query }
}

export const getAllClientSearchQuery = (searchQuery, type, startDate = "", endDate = "",branchId=false) => {
  console.log("query", searchQuery, type, startDate, endDate);

  if (startDate && endDate) {
    const validStartDate = getValidateDate(startDate)
    if (!validStartDate) return { success: false, message: "start date not formated" }
    const validEndDate = getValidateDate(endDate)
    if (!validEndDate) return { success: false, message: "end date not formated" }
  }

  let query = {
    $and: [
      { isActive: type },
      branchId ? {branchId:{ $regex: branchId, $options: "i" }} : {} ,
      {
        $or: [
          { "profile.consultantName": { $regex: searchQuery, $options: "i" } },
          { "profile.fatherName": { $regex: searchQuery, $options: "i" } },
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
  return { success: true, query: query }
}

export const getAllClientResult = async (req) => {
  try {
    const { employee, admin } = req
    let { limit = 10, pageNo = 0, search = "", startDate = "", endDate = "" } = req.query
    pageNo = pageNo ? (pageNo - 1) * limit : 0

    const matchQuery = {
      "isActive": true,
    }
    
    if(employee){
      matchQuery.branchId = { $regex: employee?.branchId || "", $options: "i", }
    }

    if (startDate && endDate) {
      matchQuery.createdAt = {
        "$gte": new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        "$lte": new Date(new Date(endDate).setHours(23, 59, 59, 999))
      }
    }

    if(employee && !["sales","branch","operation","finance"]?.includes(employee?.type?.toLowerCase())){
    return { status: 0, data: null,error:"Access deined" }
    }

    if (employee && employee?.type?.toLowerCase() == "sales" && employee?.designation?.toLowerCase() == "executive") {
      const shareClientIds = []
      const empPipeline = [
        {
          "$match": {
            "isActive": true,
            "$or": [
              { "referEmpId": employee?._id },
              { "_id": employee?._id }
            ],
          },
        },
        {
          "$project": { "_id": 1, },
        },
        {
          "$lookup": {
            "from": "sharesections",
            "localField": "_id",
            "foreignField": "toEmployeeId",
            "as": "share",
            "pipeline": [
              {
                "$match": {
                  "isActive": true,
                  "clientId": { "$ne": null, },
                },
              },
              {
                "$project": {
                  "clientId": 1,
                },
              },
            ],
          },
        },
        {
          "$match": {
            "share": { "$ne": [], },
          },
        },
      ]

      const empList = await Employee.aggregate(empPipeline)
      empList?.forEach(emp => {
        emp?.share?.forEach(sh => {
          shareClientIds?.push(sh?.clientId)
        })
      })

      if (shareClientIds?.length) {
        matchQuery._id = { $in: shareClientIds }
      }
    }

    const pipeline = [
      {
        "$match": {
          ...matchQuery,
          "$or": [
            { "profile.consultantName": { "$regex": search, "$options": "i", }, },
            { "profile.fatherName": { "$regex": search, "$options": "i", }, },
            { "profile.consultantCode": { "$regex": search, "$options": "i", }, },
            { "profile.primaryMobileNo": { "$regex": search, "$options": "i", }, },
            { "profile.primaryEmail": { "$regex": search, "$options": "i", }, },
            { "profile.aadhaarNo": { "$regex": search, "$options": "i", }, },
            { "profile.panNo": { "$regex": search, "$options": "i", }, },
            { "branchId": { "$regex": search, "$options": "i", }, },
          ],
        },
      },
      {
        "$project": {
          "branchId": 1,
          "salesId": 1,
          "isActive": 1,
          "profile.associateWithUs": 1,
          "profile.consultantName": 1,
          "profile.consultantCode": 1,
          "profile.primaryMobileNo": 1,
          "profile.primaryEmail": 1,
          "profile.city": 1,
          "profile.state": 1,
          "profile.fatherName": 1,
          "profile.whatsappNo": 1,
          "profile.dob": 1,
          "profile.address": 1,
          "profile.pinCode": 1,
          "profile.about": 1,
          "createdAt": 1,
        },
      },
      {
        "$facet": {
          "data": [
            { "$sort": { "createdAt": -1, }, },
            {
              "$lookup": {
                "from": "sharesections",
                "localField": "_id",
                "foreignField": "clientId",
                "as": "share",
                "pipeline": [
                  { "$match": { "isActive": true, }, },
                  {
                    "$lookup": {
                      "from": "employees",
                      "localField": "toEmployeeId",
                      "foreignField": "_id",
                      "as": "emp",
                      "pipeline": [
                        {
                          "$match": { "isActive": true, },
                        },
                        {
                          "$project": {
                            "fullName": 1,
                            "type": 1,
                            "designation": 1,
                            "branchId": 1,
                            "empId": 1,
                          },
                        },
                      ],
                    },
                  },
                  {
                    "$unwind": {
                      "path": "$emp",
                      "preserveNullAndEmptyArrays": true,
                    },
                  },
                  {
                    "$project": { "emp": 1, },
                  },
                ],
              },
            },
            { "$skip": Number(pageNo), },
            { "$limit": Number(limit), },
          ],
          "totalCount": [
            { "$count": "count", },
          ],
        },
      },
    ]

    const result = await Client.aggregate(pipeline)
    return { status: 1, data: result?.[0]?.data, noOfClient: result?.[0]?.totalCount?.[0]?.count }
  } catch (error) {
    console.log("getAllClientResult error",error);
    return { status: 0, data: null,error }
  }
}

export const getAllPartnerResult = async (req,employee=null) => {
  try {
    let { limit = 10, pageNo = 0, search = "", startDate = "", endDate = "",empId="" } = req.query
    pageNo = pageNo ? (pageNo - 1) * limit : 0

    const matchQuery = { }
    console.log(req?.query?.type,"type",req?.query?.type=="false");
    

    const caseAccess = ["operation", "finance", "branch"]

    //  for self employee and other employee
    let empDetails = employee
    if (empId && empId != "false") {
      if (!validMongooseId(empId)) return { status: 400, data: null,message:"Not a valid employee Id" }
      empDetails = await Employee.findById(empId)
      if (!empDetails)  return { status: 400, data: null,message:"Searching employee account not found" }
    }

    let extactMatchQuery = []
    
    // manage role wise other emp case details access
    if(empDetails){
      const { type, designation } = empDetails
      if (empDetails && (!caseAccess?.includes(type?.toLowerCase()) || (empId && empId != "false"))) {
        extactMatchQuery = [
          { _id: empDetails?._id },
          { referEmpId: empDetails?._id },
          { headEmpId: empDetails?._id },
          { managerId: empDetails?._id },

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
              }
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
        
        matchQuery['$and'] = [{
          $or: [
            { empObjId: { $in: extactOptions?.[0]?.empIds } },
            { _id: { $in: extactOptions?.[0]?.allPartnerIds } }
          ]
        }]
      }

        matchQuery.branchId = { $regex: empDetails?.branchId || "", $options: "i", }      
    }

    if (startDate && endDate) {
      matchQuery.createdAt = {
        "$gte": new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        "$lte": new Date(new Date(endDate).setHours(23, 59, 59, 999))
      }
    }

    matchQuery.isActive = req.query?.type=="false" ? false : true
    
    const pipeline = [
      {
        "$match": {
          ...matchQuery,
          "$or": [
            { "profile.consultantName": { "$regex": search, "$options": "i", }, },
            { "profile.workAssociation": { "$regex": search, "$options": "i", }, },
            { "profile.consultantCode": { "$regex": search, "$options": "i", }, },
            { "profile.primaryMobileNo": { "$regex": search, "$options": "i", }, },
            { "profile.primaryEmail": { "$regex": search, "$options": "i", }, },
            { "profile.aadhaarNo": { "$regex": search, "$options": "i", }, },
            { "profile.panNo": { "$regex": search, "$options": "i", }, },
            { "branchId": { "$regex": search, "$options": "i", }, },
          ],
        },
      },
      {
        "$project": {
          "branchId": 1,
          "salesId": 1,
          "isActive": 1,
          "profile.associateWithUs": 1,
          "profile.consultantName": 1,
          "profile.consultantCode": 1,
          "profile.primaryMobileNo": 1,
          "profile.primaryEmail": 1,
          "profile.workAssociation": 1,
          "profile.areaOfOperation": 1,
          "createdAt": 1,
        },
      },
      { "$sort": { "createdAt": -1, }, },
      {
        "$facet": {
          "data": [
            {
              "$lookup": {
                "from": "sharesections",
                "localField": "_id",
                "foreignField": "partnerId",
                "as": "share",
                "pipeline": [
                  { "$match": { "isActive": true,"partnerId": { "$ne": null},} },
                  {
                    "$lookup": {
                      "from": "employees",
                      "localField": "toEmployeeId",
                      "foreignField": "_id",
                      "as": "emp",
                      "pipeline": [
                        {
                          "$match": { "isActive": true, },
                        },
                        {
                          "$project": {
                            "fullName": 1,
                            "type": 1,
                            "designation": 1,
                            "branchId": 1,
                            "empId": 1,
                          },
                        },
                      ],
                    },
                  },
                  {
                    "$unwind": {
                      "path": "$emp",
                      "preserveNullAndEmptyArrays": true,
                    },
                  },
                  {
                    "$project": { "emp": 1, },
                  },
                ],
              },
            },
            {
              "$lookup": {
                "from": "employees",
                "localField": "salesId",
                "foreignField": "_id",
                "as": "addedBy",
                "pipeline": [
                  { "$match": { "isActive": true, }, },
                  {
                    "$project": {
                      "fullName": 1,
                      "type": 1,
                      "designation": 1,
                      "branchId": 1,
                      "empId": 1,
                    },
                  },
                ],
              },
            },
            {
              "$unwind": {
                "path": "$addedBy",
                "preserveNullAndEmptyArrays": true,
              },
            },
            { "$skip": Number(pageNo), },
            { "$limit": Number(limit), },
          ],
          "totalCount": [
            { "$count": "count", },
          ],
        },
      },
    ]

    const result = await Partner.aggregate(pipeline)
    return { status: 200,message:"Fetch partner list", data: result?.[0]?.data, noOfPartner: result?.[0]?.totalCount?.[0]?.count }
  } catch (error) {
    console.log("getAllPartnerResult error", error);
    return { status: 500, data: null,message:"Something went wrong!", error }
  }
}

export const getAllEmployeeSearchQuery = (searchQuery,type=true,department=false,exclude=false,branchId=false) => {
  let query = {
    $and:[
      {isActive:type},
      department ? {type:{ $regex: department, $options: "i" }} :{},
      exclude ? {_id:{$ne:exclude}} :{},
      branchId ? {branchId:{ $regex: branchId, $options: "i" }} :{},
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
  };
  return query
}

export const getEmployeeByIdQuery = (searchQuery,department,branchId) => {
  let query = {
    $and:[
      {isActive:true},
      department ? {type:{ $regex: department, $options: "i" }} :{},
      branchId ? {branchId:{ $regex: branchId, $options: "i" }} :{},
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
  };
  return query
}

export const validateResetPassword = (body) => {
  const resetPassword = Joi.object({
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().required(),
  })
  return resetPassword.validate(body)
}

export const validateAddCaseFile = (body) => {
  const resetPassword = Joi.object({
    docDate: Joi.string().allow('').optional(),
    docName: Joi.string().allow('').optional(),
    docType: Joi.string().allow('').optional(),
    docFormat: Joi.string().allow('').optional(),
    docURL: Joi.any().required(),
  })
  return resetPassword.validate(body)
}


export const validateAddComplaint = (body) => {
  const bodySchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    mobileNo: Joi.string().required(),
    claim_type: Joi.string().allow('').optional(),
    complaint_type: Joi.string().allow('').optional(),
    complaint_brief: Joi.string().allow('').optional(),
  })

  return bodySchema.validate(body)
}


export const getAllInvoiceQuery = (searchQuery,startDate,endDate,clientId=false,type=true,branchId=false) => {
  console.log("type",searchQuery,startDate,endDate,clientId,type);
  if (startDate && endDate) {
    const validStartDate = getValidateDate(startDate)
    if (!validStartDate) return { success: false, message: "start date not formated" }
    const validEndDate = getValidateDate(endDate)
    if (!validEndDate) return { success: false, message: "end date not formated" }
  }

  let query = {
    $and: [
      { isActive: type},
      clientId ? { clientId: clientId } : {},
      branchId ? { branchId: { $regex: branchId, $options: "i" } } : {},
      {
        $or: [
          { "receiver.name": { $regex: searchQuery, $options: "i" } },
          { "receiver.address": { $regex: searchQuery, $options: "i" } },
          { "receiver.state": { $regex: searchQuery, $options: "i" } },
          { "receiver.country": { $regex: searchQuery, $options: "i" } },
          { "receiver.pinCode": { $regex: searchQuery, $options: "i" } },
          { "receiver.gstNo": { $regex: searchQuery, $options: "i" } },
          { "receiver.panNo": { $regex: searchQuery, $options: "i" } },
          { "receiver.email": { $regex: searchQuery, $options: "i" } },
          { "receiver.mobileNo": { $regex: searchQuery, $options: "i" } },
          { invoiceNo: { $regex: searchQuery, $options: "i" } },
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

  // console.log("my-query", query);
  return { success: true, query: query }
}


export const partnerGetDownloadCaseExcel = async (getAllCase = []) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No.', key: 'sNo', width: 10 },
    // { header: 'Branch ID', key: 'branchId', width: 20 },
    { header: 'Current Status', key: 'currentStatus', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Case Name', key: 'name', width: 30 },
    { header: 'Mobile No', key: 'mobileNo', width: 30 },
    { header: 'Email Id', key: 'email', width: 30 },
    { header: 'claim Amount', key: 'claimAmount', width: 30 },
    { header: 'Policy No', key: 'policyNo', width: 30 },
    { header: 'File No', key: 'fileNo', width: 30 },
    { header: 'Policy Type', key: 'policyType', width: 30 },
    { header: 'Complaint Type', key: 'complaintType', width: 30 },
    { header: 'Father Name', key: 'fatherName', width: 30 },
    { header: 'Insurance Company Name', key: 'insuranceCompanyName', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'DOB', key: 'DOB', width: 30 },
    { header: 'Pin Code', key: 'pinCode', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'Problem Statement', key: 'problemStatement', width: 30 },
    // { header: 'Partner Consultant Code', key: 'partnerCode', width: 20 },
  ];

  // Populate Excel rows with data
  getAllCase.forEach((caseData, index) => {
    worksheet.addRow({
      sNo: index+1 || "",
      // branchId: caseData?.branchId,
      currentStatus: caseData?.currentStatus,
      date: caseData?.createdAt,
      name: caseData.name,
      mobileNo: caseData?.mobileNo,
      email: caseData?.email,
      claimAmount: caseData?.claimAmount,
      policyNo: caseData?.policyNo,
      fileNo: caseData?.fileNo,
      policyType: caseData?.policyType,
      complaintType: caseData?.complaintType,
      fatherName: caseData?.fatherName,
      insuranceCompanyName: caseData?.insuranceCompanyName,
      address: caseData?.address,
      DOB: caseData?.DOB,
      pinCode: caseData?.pinCode,
      city: caseData?.city,
      state: caseData?.state,
      problemStatement: caseData?.problemStatement,
      // partnerCode: caseData?.partnerCode || "-",
    });
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}


export const getDownloadCaseExcel = async (getAllCase = [],_id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No.', key: 'sNo', width: 10 },
    { header: 'Branch ID', key: 'branchId', width: 20 },
    { header: 'Current Status', key: 'currentStatus', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Case From', key: 'caseFrom', width: 20 },
    {header:"Team Added By",key:"addedBy",width:20},
    { header: 'Partner Name', key: 'partnerName', width: 20 },
    { header: 'Case Name', key: 'name', width: 30 },
    { header: 'Mobile No', key: 'mobileNo', width: 30 },
    { header: 'Email Id', key: 'email', width: 30 },
    { header: 'claim Amount', key: 'claimAmount', width: 30 },
    { header: 'Policy No', key: 'policyNo', width: 30 },
    { header: 'File No', key: 'fileNo', width: 30 },
    { header: 'Policy Type', key: 'policyType', width: 30 },
    { header: 'Complaint Type', key: 'complaintType', width: 30 },
    { header: 'Father Name', key: 'fatherName', width: 30 },
    { header: 'Insurance Company Name', key: 'insuranceCompanyName', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'DOB', key: 'DOB', width: 30 },
    { header: 'Pin Code', key: 'pinCode', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'Problem Statement', key: 'problemStatement', width: 30 },
  ];

  // Populate Excel rows with data
  getAllCase.forEach((caseData, index) => {
    worksheet.addRow({
      sNo: index+1 || "",
      branchId: caseData?.branchId,
      currentStatus: caseData?.currentStatus,
      date: caseData?.createdAt,
      caseFrom: caseData?.caseFrom,
      addedBy: caseData?.employeeDetails?.fullName ? `${caseData?.employeeDetails?.fullName} | ${caseData?.employeeDetails?.type} | ${caseData?.employeeDetails?.designation}` : "-",
      partnerName: caseData?.partnerDetails?.fullName || "-",
      name: caseData.name,
      mobileNo: caseData?.mobileNo,
      email: caseData?.email,
      claimAmount: caseData?.claimAmount,
      policyNo: caseData?.policyNo,
      fileNo: caseData?.fileNo,
      policyType: caseData?.policyType,
      complaintType: caseData?.complaintType,
      fatherName: caseData?.fatherName,
      insuranceCompanyName: caseData?.insuranceCompanyName,
      address: caseData?.address,
      DOB: caseData?.DOB,
      pinCode: caseData?.pinCode,
      city: caseData?.city,
      state: caseData?.state,
      problemStatement: caseData?.problemStatement,
      // partnerCode: caseData?.partnerCode || "-",
    });
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}

export const commonDownloadCaseExcel = async (getAllCase = [],_id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No.', key: 'sNo', width: 10 },
    { header: 'Branch ID', key: 'branchId', width: 20 },
    { header: 'Current Status', key: 'currentStatus', width: 30 },
    { header: 'Status Date', key: 'statusDate', width: 20 },
    { header: 'Status Remark', key: 'statusRemark', width: 20 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Case From', key: 'caseFrom', width: 20 },
    {header:"Team Added By",key:"addedBy",width:20},
    { header: 'Partner Name', key: 'partnerName', width: 20 },
    { header: 'Case Name', key: 'name', width: 30 },
    { header: 'Mobile No', key: 'mobileNo', width: 30 },
    { header: 'Email Id', key: 'email', width: 30 },
    { header: 'claim Amount', key: 'claimAmount', width: 30 },
    { header: 'Policy No', key: 'policyNo', width: 30 },
    { header: 'File No', key: 'fileNo', width: 30 },
    { header: 'Policy Type', key: 'policyType', width: 30 },
    { header: 'Complaint Type', key: 'complaintType', width: 30 },
    { header: 'Father Name', key: 'fatherName', width: 30 },
    { header: 'Insurance Company Name', key: 'insuranceCompanyName', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'DOB', key: 'DOB', width: 30 },
    { header: 'Pin Code', key: 'pinCode', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'Problem Statement', key: 'problemStatement', width: 30 },
    { header: 'Payment mode', key: 'paymentMode', width: 20 },
    { header: 'Date of payment', key: 'dateOfPayment', width: 20 },
    { header: 'Bank name', key: 'bankName', width: 20 },
    { header: 'Cheque number', key: 'chequeNumber', width: 20 },
    { header: 'Amount', key: 'amount', width: 20 },
    { header: 'Cheque date', key: 'chequeDate', width: 20 },
    { header: 'UTR number', key: 'utrNumber', width: 20 },
    { header: 'Transaction date', key: 'transactionDate', width: 20 },
  ];

  // Populate Excel rows with data
  getAllCase.forEach((caseData, index) => {
    const paymentDetails = caseData?.paymentDetails?.length>0 ? caseData?.paymentDetails : [{}];
    paymentDetails?.forEach((payment,ind)=>{
      worksheet.addRow({
        sNo: (index+1 || ""),
        branchId:caseData?.branchId || "",
        currentStatus: caseData?.currentStatus || "",
        statusDate: ind==0 ? (caseData?.latestCaseStatus?.date || caseData?.latestCaseStatus?.createdAt || "-") :"" ,
        statusRemark: ind==0 ? (caseData?.latestCaseStatus?.remark || "-") :"" ,
        date: ind==0 ? (caseData?.createdAt || "") :"" ,
        caseFrom: ind==0 ? (caseData?.caseFrom || "") :"" ,
        addedBy: ind==0 ?( caseData?.employeeDetails?.fullName ? `${caseData?.employeeDetails?.fullName} | ${caseData?.employeeDetails?.type} | ${caseData?.employeeDetails?.designation}` : "-") :"" ,
        partnerName: ind==0 ? (caseData?.partnerDetails?.fullName || "-") :"" ,
        name: ind==0 ? (caseData.name ||"") :"" ,
        mobileNo: ind==0 ?( caseData?.mobileNo ||"") :"" ,
        email: ind==0 ? (caseData?.email ||"") :"" ,
        claimAmount: ind==0 ?( caseData?.claimAmount ||"") :"" ,
        policyNo: ind==0 ? (caseData?.policyNo ||"") :"" ,
        fileNo: caseData?.fileNo ||"" ,
        policyType: ind==0 ? (caseData?.policyType ||"") :"" ,
        complaintType: ind==0 ? (caseData?.complaintType ||"") :"" ,
        fatherName: ind==0 ? (caseData?.fatherName ||""):"" ,
        insuranceCompanyName: ind==0 ? (caseData?.insuranceCompanyName || "") :"" ,
        address: ind==0 ? (caseData?.address ||"") :"" ,
        DOB: ind==0 ? ( caseData?.DOB ||"") :"" ,
        pinCode: ind==0 ? (caseData?.pinCode || "") :"" ,
        city: ind==0 ?( caseData?.city || "") :"" ,
        state: ind==0 ? (caseData?.state ||"") :"" ,
        problemStatement: ind==0 ? (caseData?.problemStatement ||"") :"" ,
        paymentMode:payment?.paymentMode ||"-",
        dateOfPayment:payment?.dateOfPayment || "-",
        bankName:payment?.bankName ||"-",
        chequeNumber:payment?.chequeNumber || "-",
        amount:payment?.amount || "-",
        chequeDate:payment?.chequeDate || "-",
        utrNumber:payment?.utrNumber || "-",
        transactionDate:payment?.transactionDate || "-",
      });
    })
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}

export const getAllPartnerDownloadExcel = async (getAllPartner = [], _id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No', key: 'sNo', width: 10 },
    { header: 'Branch ID', key: 'branchId', width: 20 },
    { header: 'Team Added by', key: 'addedBy', width: 20 },
    { header: 'Partner Name', key: 'consultantName', width: 20 },
    { header: 'Mobile No', key: 'primaryMobileNo', width: 20 },
    { header: 'Email Id', key: 'primaryEmail', width: 20 },
    { header: 'Consultant Code', key: 'consultantCode', width: 30 },
    { header: 'Associate With Us', key: 'associateWithUs', width: 30 },
    { header: 'Work Association', key: 'workAssociation', width: 30 },
    { header: 'Area Of Operation', key: 'areaOfOperation', width: 30 },
    { header: 'Alternate Email', key: 'alternateEmail', width: 30 },
    { header: 'Whatsapp No', key: 'whatsappNo', width: 30 },
    { header: 'Alternate MobileNo', key: 'alternateMobileNo', width: 30 },
    { header: 'Aadhaar No', key: 'aadhaarNo', width: 30 },
    { header: 'DOB', key: 'dob', width: 30 },
    { header: 'Gender', key: 'gender', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'District', key: 'district', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'PinCode', key: 'pinCode', width: 30 },
    { header: 'About', key: 'about', width: 30 },
    { header: 'Bank Name', key: 'bankName', width: 30 },
    { header: 'Bank Account No', key: 'bankAccountNo', width: 30 },
    { header: 'Bank Branch Name', key: 'bankBranchName', width: 30 },
    { header: 'GST No', key: 'gstNo', width: 30 },
    { header: 'PAN No', key: 'panNo', width: 30 },
    { header: 'IFSC Code', key: 'ifscCode', width: 30 },
    { header: 'UPI Id', key: 'upiId', width: 30 },
  ];

  // Populate Excel rows with data
  getAllPartner.forEach((partnerData, index) => {
    worksheet.addRow({
      sNo: index+1 || "",
      branchId: partnerData?.branchId,
      addedBy:(partnerData?.salesId?.type && partnerData?.salesId?.fullName) ? `${partnerData?.salesId?.fullName} | ${partnerData?.salesId?.type} | ${partnerData?.salesId?.designation}` : "-",
      consultantName: partnerData?.profile?.consultantName,
      primaryMobileNo: partnerData?.profile?.primaryMobileNo,
      primaryEmail: partnerData?.profile?.primaryEmail,
      consultantCode: partnerData?.profile?.consultantCode,
      associateWithUs: partnerData?.profile?.associateWithUs,
      workAssociation: partnerData?.profile?.workAssociation,
      areaOfOperation: partnerData?.profile?.areaOfOperation,
      alternateEmail: partnerData?.profile?.alternateEmail,
      whatsappNo: partnerData?.profile?.whatsupNo,
      alternateMobileNo: partnerData?.profile?.alternateMobileNo,
      aadhaarNo: partnerData?.profile?.aadhaarNo,
      dob: partnerData?.profile?.dob,
      gender: partnerData?.profile?.gender,
      state: partnerData?.profile?.state,
      district: partnerData?.profile?.district,
      city: partnerData?.profile?.city,
      pinCode: partnerData?.profile?.pinCode,
      about: partnerData?.profile?.about,
      bankName: partnerData?.bankingDetails?.bankName,
      bankAccountNo: partnerData?.bankingDetails?.bankAccountNo,
      bankBranchName: partnerData?.bankingDetails?.bankBranchName,
      gstNo: partnerData?.bankingDetails?.gstNo,
      panNo: partnerData?.bankingDetails?.panNo,
      ifscCode: partnerData?.bankingDetails?.ifscCode,
      upiId: partnerData?.bankingDetails?.upiId,
    });
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}



export const getAllSathiDownloadExcel = async (getAllSathi = [], _id) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No', key: 'sNo', width: 10 },
    { header: 'Branch Id', key: 'branchId', width: 20 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Team Added By', key: 'addedBy', width: 20 },
    { header: 'Employee Name', key: 'fullName', width: 20 },
    { header: 'Emp Id', key: 'empId', width: 20 },
    { header: 'Mobile No', key: 'mobileNo', width: 30 },
    { header: 'Email Id', key: 'email', width: 30 },
    { header: 'Department', key: 'type', width: 30 },
    { header: 'Designation', key: 'designation', width: 30 },

  ];

  // Populate Excel rows with data
  getAllSathi.forEach((sathi, index) => {
    worksheet.addRow({
      sNo: index+1 || "-",
      branchId:sathi?.branchId,
      date:new Date(sathi?.createdAt).toLocaleDateString(),
      addedBy:(sathi?.referEmpId?.fullName && sathi?.referEmpId?.type) ? `${sathi?.referEmpId?.fullName} | ${sathi?.referEmpId?.type} | ${sathi?.referEmpId?.designation}` : "-",
      fullName:sathi?.fullName,
      empId:sathi?.empId,
      mobileNo:sathi?.mobileNo,
      email:sathi?.email,
      type:sathi?.type,
      designation:sathi?.designation,
    });
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}

export const getAllClientDownloadExcel = async (getAllClient = []) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No', key: 'sNo', width: 10 },
    { header: 'Branch ID', key: 'branchId', width: 20 },
    { header: 'Associate With Us', key: 'associateWithUs', width: 30 },
    { header: 'Client Name', key: 'consultantName', width: 20 },
    { header: 'Client Code', key: 'consultantCode', width: 30 },
    { header: 'Mobile No', key: 'primaryMobileNo', width: 30 },
    { header: 'Email Id', key: 'primaryEmail', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'Father Name', key: 'fatherName', width: 30 },
    { header: 'Whatsapp No', key: 'whatsappNo', width: 30 },
    { header: 'DOB', key: 'dob', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Pin Code', key: 'pinCode', width: 30 },
    { header: 'About', key: 'about', width: 30 },
  ];

  // Populate Excel rows with data

  let rowData =
    getAllClient.forEach((clientData, index) => {
      worksheet.addRow({
        sNo: index+1 || "",
        branchId: clientData?.branchId || "-",
        associateWithUs: clientData?.profile?.associateWithUs,
        consultantName: clientData?.profile?.consultantName,
        consultantCode: clientData?.profile?.consultantCode,
        primaryMobileNo: clientData?.profile?.primaryMobileNo,
        primaryEmail: clientData?.profile?.primaryEmail,
        city: clientData?.profile?.city,
        state: clientData?.profile?.state,
        fatherName: clientData?.profile?.fatherName,
        whatsappNo: clientData?.profile?.whatsupNo,
        dob: clientData?.profile?.dob,
        address: clientData?.profile?.address,
        pinCode: clientData?.profile?.pinCode,
        about: clientData?.profile?.about,
      });
    });

  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}

const dateOptions = {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  timeZoneName: 'short'
};


export const editServiceAgreement = async (path, date) => {
  const today = date?.toLocaleString('en-US', dateOptions)?.split("GMT")?.[0]
  const existingPdfBytes = await fsAsync.readFile(path);
  const pdfBytes = await PDFDocument.load(existingPdfBytes);
  const page = pdfBytes.getPages()[pdfBytes.getPages()?.length ? pdfBytes.getPages()?.length - 1 : 0]; // Assuming you're working with the first page
  page.drawText(today, { x: 50, y: 50 });
  const modifiedPdfBytes = await pdfBytes.save();
  return modifiedPdfBytes;
}

export const firebaseUpload = async (req, res, folderPath) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        console.log("err", err);
        return res.status(400).json({ success: false, message: 'Failed to upload file.' });
      } else if (err) {
        return res.status(400).json({ success: false, message: 'Unknown error uploading file.' });
      }

      const file = req?.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
      }
      const fileName = file.originalname;
      const remoteFolderPath = folderPath ? `${folderPath}/` : "";
      const fileFolder = `${remoteFolderPath}${new Date().getTime()}_${fileName}`;

      console.log("fileName", fileName, fileFolder);
      const fileUpload = bucket.file(fileFolder);

      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      blobStream.on('error', (error) => {
        console.log("error",error);
        return res.status(400).json({ success: false, message: "Failed to upload file" });
      });

      blobStream.on('finish', async () => {
        const fileRef = bucket.file(fileFolder)
        const downloadURL = await getDownloadURL(fileRef);
        return res.status(200).json({ success: true, message: 'File uploaded successfully.', url: downloadURL });
      });

      blobStream.end(file.buffer);
    } catch (error) {
      console.log("firebaseUpload error:", error);
      return res.status(500).json({ success: false, message: "Failed to upload file!" });
    }
  });
}

export const backupMongoDB = (dbName, backupPath) => {
  return new Promise((resolve, reject) => {
    const dumpCommand = `mongodump --db ${dbName} --out ${backupPath} --gzip`;
    exec(dumpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating MongoDB dump: ${error}`);
        return reject(error);
      }
      resolve(path.join(backupPath, dbName));
    });
  });
};

export const commonInvoiceDownloadExcel = async (getAllInvoice = []) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoice');

  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No.', key: 'sNo', width: 10 },
    { header: 'Branch', key: 'branch', width: 10 },
    { header: 'Bill Date', key: 'billDate', width: 20 },
    { header: 'Invoice No', key: 'invoiceNo', width: 30 },
    { header: 'Invoice To', key: 'paidBy', width: 30 },
    { header: 'Sender Name', key: 'senderName', width: 30 },
    { header: 'Sender GST No.', key: 'senderGst', width: 30 },
    { header: 'Sender PAN No.', key: 'senderPan', width: 30 },
    { header: 'Sender Email', key: 'senderEmail', width: 30 },
    { header: 'Sender Mobile No.', key: 'senderMobile', width: 30 },
    { header: 'Sender Address', key: 'senderAddress', width: 30 },
    { header: 'Sender State', key: 'senderState', width: 30 },
    { header: 'Sender Country', key: 'senderCountry', width: 30 },
    { header: 'Receiver Name', key: 'receiverName', width: 30 },
    { header: 'Receiver GST No.', key: 'receiverGst', width: 30 },
    { header: 'Receiver PAN No.', key: 'receiverPan', width: 30 },
    { header: 'Receiver Email', key: 'receiverEmail', width: 30 },
    { header: 'Receiver Mobile No.', key: 'receiverMobile', width: 30 },
    { header: 'Receiver Address', key: 'receiverAddress', width: 30 },
    { header: 'Receiver State', key: 'receiverState', width: 30 },
    { header: 'Receiver Country', key: 'receiverCountry', width: 30 },
    { header: 'Paid', key: 'paid', width: 15 },
    { header: 'Payment Mode', key: 'paymentMode', width: 20 },
    { header: 'Remark', key: 'remark', width: 40 },
    { header: 'Item Description', key: 'itemDesc', width: 40 },
    { header: 'Item Qty', key: 'itemQty', width: 10 },
    { header: 'Item GST (%)', key: 'itemGst', width: 15 },
    { header: 'Item Rate', key: 'itemRate', width: 15 },
    { header: 'Item GST Amount', key: 'itemGstAmt', width: 20 },
    { header: 'Item Total Amount', key: 'itemAmt', width: 20 },
    { header: 'Sub Amount', key: 'subAmt', width: 20 },
    { header: 'CGST', key: 'cgst', width: 15 },
    { header: 'SGST', key: 'sgst', width: 15 },
    { header: 'IGST', key: 'igst', width: 15 },
    { header: 'Total Amount', key: 'totalAmt', width: 20 },
  ];

  // Populate rows
  getAllInvoice.forEach((invData, index) => {
    const isIgst = invData?.sender?.state !== invData?.receiver?.state; // IGST when states differ
    invData?.invoiceItems?.forEach((item, itemIndex) => {
      worksheet.addRow({
        sNo: itemIndex === 0 ? index + 1 : "",
        branch: invData?.branchId || "",
        billDate: invData?.billDate ? new Date(invData?.billDate) : '',
        invoiceNo: invData?.invoiceNo || "",
        paidBy: invData?.isOffice ? "Client" : "Office",
        senderName: itemIndex === 0 ? invData?.sender?.name || '' : "",
        senderGst: itemIndex === 0 ? invData?.sender?.gstNo || '' : "",
        senderPan: itemIndex === 0 ? invData?.sender?.panNo || '' : "",
        senderEmail: itemIndex === 0 ? invData?.sender?.email || '' : "",
        senderMobile: itemIndex === 0 ? invData?.sender?.mobileNo || '' : "",
        senderAddress: itemIndex === 0 ? invData?.sender?.address || '' : "",
        senderState: itemIndex === 0 ? invData?.sender?.state || '' : "",
        senderCountry: itemIndex === 0 ? invData?.sender?.country || '' : "",
        receiverName: itemIndex === 0 ? invData?.receiver?.name || '' : "",
        receiverGst: itemIndex === 0 ? invData?.receiver?.gstNo || '' : "",
        receiverPan: itemIndex === 0 ? invData?.receiver?.panNo || '' : "",
        receiverEmail: itemIndex === 0 ? invData?.receiver?.email || '' : "",
        receiverMobile: itemIndex === 0 ? invData?.receiver?.mobileNo || '' : "",
        receiverAddress: itemIndex === 0 ? invData?.receiver?.address || '' : "",
        receiverState: itemIndex === 0 ? invData?.receiver?.state || '' : "",
        receiverCountry: itemIndex === 0 ? invData?.receiver?.country || '' : "",
        paid: itemIndex === 0 ? (invData?.isPaid ? "Yes" : "No") : "",
        paymentMode: itemIndex === 0 ? invData?.transactionId?.paymentMode || '' : "",
        remark: itemIndex === 0 ? invData?.remark || '' : "",
        itemDesc: item?.description || '',
        itemQty: item?.quantity || "",
        itemGst: item?.gstRate || "",
        itemRate: item?.rate || "",
        itemGstAmt: item?.gstAmt || "",
        itemAmt: item?.amt || "",
        subAmt: itemIndex === 0 ? invData?.subAmt || "" : "",
        cgst: itemIndex === 0 ? (!isIgst ? invData?.gstAmt / 2 : "") : "",
        sgst: itemIndex === 0 ? (!isIgst ? invData?.gstAmt / 2 : "") : "",
        igst: itemIndex === 0 ? (isIgst ? invData?.gstAmt : "") : "",
        totalAmt: itemIndex === 0 ? invData?.totalAmt || "" : "",
      });
    });
  });

  // Generate Excel file buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return buffer;
};

export const sendNotificationAndMail = async (caseId, message, branchId="", userId, notificationUrl, notificationAdminUrl) => {
  try {
    let mailList = []

    if(branchId){
      const getAllEmp = await Employee.find({
        branchId: { $regex: branchId, $options: "i" },
        isActive: true,
        $or: [
          { type: { $regex: "^Operation$", $options: "i" } },
          { type: { $regex: "^Branch$", $options: "i" } },
        ],
      }).select("email");

     mailList = getAllEmp?.map(ele => ele?.email)
    }

    const findAdmin = await Admin.find({}).select("email")
    findAdmin?.forEach(ele => mailList.push(ele?.email))

    const mailTo = findAdmin?.[0]?.email || process.env.ADMIN_MAIL_ID



    if (caseId) {
      let empIds =[]
      if(userId){
        empIds = [userId]
      }
      const addNotification = new Notification({
        caseId: caseId,
        message: message,
        branchId: branchId,
        empIds: empIds
      })
      await addNotification.save()
    }

    const empUrl = process.env.PANEL_FRONTEND_URL + notificationUrl
    const adminUrl = process.env.PANEL_FRONTEND_URL + notificationAdminUrl

    await commonSendMail(
      generateNotificationTemplate(message, empUrl, adminUrl),
      "Claimsolution latest notification",
      mailTo,
      [],
      mailList?.filter(ele=>ele && ele!=mailTo)
    )
    console.log("successfully sendNotificationAndMail");
    
  } catch (error) {
    console.log("sendNotificationAndMail", error);

  }
}


export const getAllStatementDownloadExcel = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Statement');
  // Define Excel columns
  worksheet.columns = [
    { header: 'SL No', key: 'sNo', width: 10 },
    { header: 'Branch Id', key: 'branchId', width: 20 },
    { header: 'Name', key: 'Name', width: 30 },
    { header: 'Consultant Code/ Sathi Id', key: 'ConsultantCode_SathiId', width: 30 },
    { header: 'Bank Name', key: 'bankName', width: 30 },
    { header: 'Bank Account No', key: 'bankAccountNo', width: 30 },
    { header: 'Bank Branch', key: 'bankBranchName', width: 30 },
    { header: 'Manager Name', key: 'manager_name', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'PAN No', key: 'panNo', width: 30 },
    { header: 'Case Login', key: 'caseLogin', width: 20 },
    { header: 'Policy Holder', key: 'policyHolder', width: 20 },
    { header: 'File No', key: 'fileNo', width: 20 },
    { header: 'Policy No', key: 'policyNo', width: 20 },
    { header: 'Insurance Company Name', key: 'insuranceCompanyName', width: 30 },
    { header: 'Claim Amount', key: 'claimAmount', width: 30 },
    { header: 'Approved Amt', key: 'approvedAmt', width: 30 },
    { header: 'Constultancy Fee', key: 'constultancyFee', width: 30 },
    { header: 'TDS', key: 'TDS', width: 30 },
    { header: 'Mode Of Login', key: 'modeOfLogin', width: 30 },
    { header: 'Payable Amt', key: 'payableAmt', width: 30 },

  ];



  // Populate Excel rows with data
  data.forEach((ele, index) => {
    worksheet.addRow({
      sNo: index + 1 || "-",
      branchId: ele?.partnerDetails?.branchId ? ele?.partnerDetails?.branchId : ele?.empDetails?.branchId,
      Name: ele?.partnerDetails?.consultantName ? ele?.partnerDetails?.consultantName : ele?.empDetails?.fullName,
      ConsultantCode_SathiId: ele?.partnerDetails?.consultantCode ? ele?.partnerDetails?.consultantCode : ele?.empDetails?.empId,
      bankName: ele?.partnerDetails?.bankName ? ele?.partnerDetails?.bankName : ele?.empDetails?.bankName,
      bankAccountNo: ele?.partnerDetails?.bankAccountNo ? ele?.partnerDetails?.bankAccountNo : ele?.empDetails?.bankAccountNo,
      bankBranchName: ele?.partnerDetails?.bankBranchName ? ele?.partnerDetails?.bankBranchName : ele?.empDetails?.bankBranchName,
      manager_name: ele?.partnerDetails?.referby?.fullName ? ele?.partnerDetails?.referby?.fullName : ele?.empDetails?.referby?.fullName,
      address: ele?.partnerDetails?.address ? ele?.partnerDetails?.address : ele?.empDetails?.address,
      panNo: ele?.partnerDetails?.panNo ? ele?.partnerDetails?.panNo : ele?.empDetails?.panNo,
      caseLogin: new Date(ele?.caseLogin).toLocaleDateString(),
      policyHolder: ele?.policyHolder,
      fileNo: ele?.fileNo,
      policyNo: ele?.policyNo,
      insuranceCompanyName: ele?.insuranceCompanyName,
      claimAmount: ele?.claimAmount,
      approvedAmt: ele?.approvedAmt,
      constultancyFee: ele?.constultancyFee,
      TDS: ele?.TDS,
      modeOfLogin: ele?.modeOfLogin,
      payableAmt: ele?.payableAmt,
    });
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}