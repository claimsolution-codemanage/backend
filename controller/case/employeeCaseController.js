import axios from "axios";
import { getValidateDate, sendNotificationAndMail, validMongooseId } from "../../utils/helper.js";
import { bucket } from "../../firebase/config.js";
import { Types } from "mongoose";
import Case from "../../models/case/case.js";
import CaseDoc from "../../models/caseDoc.js";
import Employee from "../../models/employee.js";
import { validateAddClientCase } from "../../utils/validateClient.js";
import * as dbFunction from "../../utils/dbFunction.js"
import { validateUpdateEmployeeCase } from "../../utils/validateEmployee.js";
import CaseStatus from "../../models/caseStatus.js";
import { sendMail } from "../../utils/sendMail.js";
import CaseComment from "../../models/caseComment.js";
import Partner from "../../models/partner.js";
import CaseMergeDetails from "../../models/caseMergeDetails.js";
import CasePaymentDetails from "../../models/casePaymentDetails.js";

export const viewAllCase = async (req, res) => {
   try {
      const { employee } = req
      let { limit = 10, pageNo = 1, search = "", status = "", startDate = "", endDate = "", empId = "", isReject = "", isWeeklyFollowUp = false, isClosed = false } = req.query
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

      matchQuery.push({ isActive: Boolean(req.query.type == "true" ? true : false) })
      matchQuery.push(isReject == "true" ? { currentStatus: { $in: ["Reject"] } } : { currentStatus: { $nin: ["Reject"] } })
      isClosed == "true" && matchQuery.push({ currentStatus: { $in: ["Closed"] } })
      isWeeklyFollowUp == "true" && matchQuery.push({ currentStatus: { $nin: ["Closed", "Reject"] } })


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

         const extactOptions = await Employee.aggregate(filterPipeline)

         matchQuery.push({
            $or: [
               { empObjId: { $in: extactOptions?.[0]?.empIds } },
               { partnerObjId: { $in: extactOptions?.[0]?.allPartnerIds } },
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
                     // $lte: new Date()
                  }
               }
            }
         ] : []),
         ...(isWeeklyFollowUp == "true" 
            ? [{ '$sort': { 'nextFollowUp': 1 } }] 
            :[{ '$sort': { 'createdAt': -1 } }]),
         
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
      console.log("view-all-emp in error:", error);
      res.status(500).json({ success: false, message: "Something went wrong", error: error });

   }
}

export const viewCaseById = async (req, res) => {
   try {
      const { employee } = req;
      const isOperation = employee?.type?.toLowerCase() === "operation";
      const employeeId = employee?._id;
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
               pipeline: [
                  {
                     $project: {
                        "profile.consultantName": 1,
                        "profile.consultantCode": 1
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
               from: "clients",
               localField: "clientObjId",
               foreignField: "_id",
               as: "clientDetails",
               pipeline: [
                  {
                     $project: {
                        "profile.consultantName": 1,
                        "profile.consultantCode": 1
                     }
                  }
               ]
            }
         },
         { $unwind: { path: "$clientDetails", preserveNullAndEmptyArrays: true } },
         {
            $lookup: {
               from: "casedocs",
               let: {
                  id: "$_id",
                  employeeId: employeeId
               },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              { $eq: ["$isActive", true] },
                              {
                                 $or: [
                                    { $eq: ["$caseId", "$$id"] },
                                    { $eq: ["$caseMargeId", { $toString: "$$id" }] }
                                 ]
                              },

                              // access control
                              ...(isOperation
                                 ? [] // operation user → NO restriction
                                 : [
                                    {
                                       $or: [
                                          // non-private docs
                                          { $ne: ["$isPrivate", true] },

                                          // private docs only if employee matches
                                          {
                                             $and: [
                                                { $eq: ["$isPrivate", true] },
                                                { $eq: ["$employeeId", "$$employeeId"] }
                                             ]
                                          }
                                       ]
                                    }
                                 ])
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
                              {
                                 $or: [
                                    { $eq: ["$caseId", "$$id"] },
                                    { $eq: ["$caseMargeId", { "$toString": "$$id" }] }
                                 ]
                              }
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
                              ...(!isOperation
                                 ? [
                                    {
                                       $or: [
                                          { $eq: ["$isPrivate", false] },
                                          { $eq: [{ $ifNull: ["$isPrivate", false] }, false] }
                                       ]
                                    }
                                 ]
                                 : []),
                              {
                                 $or: [
                                    { $eq: ["$caseId", "$$id"] },
                                    { $eq: ["$caseMargeId", { "$toString": "$$id" }] }
                                 ]
                              }
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
         ...(isOperation ? [
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
         ] : [])
      ]);

      if (!caseData.length) {
         return res.status(404).json({ success: false, message: "Case not found" });
      }

      const result = caseData[0];

      return res.status(200).json({ success: true, message: "get case data", data: result });

   } catch (error) {
      console.error("ViewCaseById error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error });
   }
};

export const updateCaseById = async (req, res) => {
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
      console.log("updateCaseById in error:", error);
      res.status(500).json({ success: false, message: "Something went wrong", error: error });

   }
}

export const changeCaseIsActive = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

      const { _id, status } = req.query
      if (!_id || !status) return res.status(400).json({ success: false, message: "required case id and status" })

      if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
      const updateCase = await Case.findByIdAndUpdate(_id, { $set: { isActive: status } }, { new: true })
      if (!updateCase) return res.status(404).json({ success: false, message: "Case not found" })

      return res.status(200).json({ success: true, message: `Now case ${updateCase?.isActive ? "Active" : "Unactive"}` });
   } catch (error) {
      console.log("empUpdateCaseIsActive in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const updateCaseStatus = async (req, res) => {
   try {
      const { employee } = req
      if (employee?.type?.toLowerCase() != "operation") {
         return res.status(400).json({ success: false, message: "Access denied" })
      }

      const { mailMethod = "", nextFollowUp = "" } = req.body

      const { error } = validateUpdateEmployeeCase(req.body)
      if (error) return res.status(400).json({ success: false, message: error.details[0].message })

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
         consultant: employee?.fullName,
         employeeId: req?.user?._id,
         caseId: req.body._id
      })
      await addNewStatus.save()

      // send notification through email and db notification
      const caseNumber = updateCase.fileNo
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

      const subject = "Update on Your Case – Status Changed"
      // client
      if (updateCase?.clientObjId?.profile?.primaryEmail && (["client", "both"]?.includes(mailMethod?.toLowerCase()))) {
         sendMail({
            to: updateCase?.clientObjId?.profile?.primaryEmail,
            subject,
            html: caseUpdateStatusTemplate({ type: "Client", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/client/view case/${req.body._id}` })
         })
      }
      // partner
      if (updateCase?.partnerObjId?.profile?.primaryEmail && (["partner", "both"]?.includes(mailMethod?.toLowerCase()))) {
         sendMail({
            to: updateCase?.partnerObjId?.profile?.primaryEmail,
            subject,
            html: caseUpdateStatusTemplate({ type: "Partner", caseNumber, statusRemark, caseStatus, caseUrl: process.env.PANEL_FRONTEND_URL + `/partner/view case/${req.body._id}` })
         })
      }
      return res.status(200).json({ success: true, message: `Case status change to ${req.body.status}` });

   } catch (error) {
      console.log("updateCaseStatus in error:", error);
      res.status(500).json({ success: false, message: "Something went wrong", error: error });

   }
}

export const empAddOrUpdateCaseComment = async (req, res) => {
   try {
      const { employee } = req
      const { comment,caseCommentId, isPrivate } = req.body

      if (!comment) return res.status(400).json({ success: false, message: "Case Comment required" })
      if (!validMongooseId(req.body._id)) return res.status(400).json({ success: false, message: "Not a valid id" })

      if(caseCommentId && !validMongooseId(caseCommentId)) return res.status(400).json({ success: false, message: "Not a valid comment ID" })


      const getCase = await Case.findById(req.body._id)
      if (!getCase) return res.status(400).json({ success: false, message: "Case not found" })

      if(caseCommentId){
         await CaseComment.findByIdAndUpdate(caseCommentId,{$set:{
         message: comment?.trim(),
         isPrivate: isPrivate ?? false,
         employeeId: req?.user?._id,
         }})
      return res.status(200).json({ success: true, message: "Successfully updated case comment" });
      }

      const newComment = new CaseComment({
         role: req?.user?.role,
         name: req?.user?.fullName,
         type: req?.user?.empType,
         message: comment?.trim(),
         isPrivate: isPrivate ?? false,
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

      return res.status(200).json({ success: true, message: "Successfully added case comment" });
   } catch (error) {
      console.log("empAddOrUpdateCaseComment in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const addReferenceCaseAndMarge = async (req, res) => {
   try {
      const { employee } = req
      const { partnerId, partnerCaseId, empSaleId, empSaleCaseId, clientCaseId } = req?.query

      if (employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Permission denied!" })
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
      console.log("addRefenceCaseAndMarge in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const removeCaseReference = async (req, res) => {
   try {
      const { employee } = req

      if (employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Permission denied!" })

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
      console.log("removeCaseReference in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const addOrUpdateCasePayment = async (req, res) => {
   try {
      const { employee } = req
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
      console.log("addOrUpdateCasePayment in error:", error);
      return res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const addCaseFile = async (req, res) => {
   try {
      await dbFunction.commonAddCaseFile(req, res, "employeeId")
   } catch (error) {
      console.log("add case file in error:", error);
      res.status(500).json({ success: false, message: "Something went wrong", error: error });
   }
}

export const empFindCaseByFileNo = async (req, res) => {
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
      console.log("empFindCaseByFileNo in error:", error);
      res.status(500).json({ success: false, message: "Something went wrong", error: error });

   }
}

export const deleteCaseById = async (req, res) => {
    try {
        const { employee } = req
        if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

        const { caseId } = req?.query
        if (!caseId) return res.status(400).json({ success: false, message: "caseId id required" })
        if (!validMongooseId(caseId)) return res.status(400).json({ success: false, message: "Not a valid caseId" })

        const deleteCaseById = await Case.findByIdAndDelete(caseId);
        if (!deleteCaseById) return res.status(404).json({ success: false, message: "Case not found" })

        return res.status(200).json({ success: true, message: "Successfully case deleted" });
    } catch (error) {
        console.log("deleteCaseById in error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong!", error: error });
    }
}

export const deleteCaseDocById = async (req, res) => {
    try {
        const { employee } = req
        if (employee?.designation?.toLowerCase() != "manager" || employee?.type?.toLowerCase() != "operation") return res.status(400).json({ success: false, message: "Access Denied" })

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
        console.log("deleteCaseDocById in error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong", error: error });
    }
}