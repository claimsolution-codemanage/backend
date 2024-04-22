import mongoose from "mongoose";
import validateDate from "validate-date";
import Joi from "joi";
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fsAsync from 'fs/promises'
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import { bucket } from "../index.js";
import multer from "multer";


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


export const getAllCaseQuery = (statusType, searchQuery, startDate, endDate, partnerId, clientId, employeeId, type = true, empSaleId = false) => {
 console.log("status",statusType);
  if (startDate && endDate) {
    const validStartDate = getValidateDate(startDate)
    if (!validStartDate) return { success: false, message: "start date not formated" }
    const validEndDate = getValidateDate(endDate)
    if (!validEndDate) return { success: false, message: "end date not formated" }
  }

  let query = {
    $and: [
      partnerId ? { partnerId: partnerId } : {},
      clientId ? { clientId: clientId } : {},
      !empSaleId && employeeId ? { addEmployee: { $in: employeeId } } : {},
      empSaleId ? { empSaleId: empSaleId } : {},
      { isPartnerReferenceCase: false },
      { isEmpSaleReferenceCase: false },

      { currentStatus: { $regex: statusType, $options: "i" } },
      { isActive: type },
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


export const getAllPartnerSearchQuery = (searchQuery, type, empSaleId = false, startDate = "", endDate = "") => {
  console.log("salesId", empSaleId, startDate, endDate);
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
      {
        $or: [
          { "profile.consultantName": { $regex: searchQuery, $options: "i" } },
          { "profile.workAssociation": { $regex: searchQuery, $options: "i" } },
          { "profile.consultantCode": { $regex: searchQuery, $options: "i" } },
          { "profile.primaryMobileNo": { $regex: searchQuery, $options: "i" } },
          { "profile.primaryEmail": { $regex: searchQuery, $options: "i" } },
          { "profile.aadhaarNo": { $regex: searchQuery, $options: "i" } },
          { "profile.panNo": { $regex: searchQuery, $options: "i" } },
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

export const getAllClientSearchQuery = (searchQuery, type, startDate = "", endDate = "") => {
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
      {
        $or: [
          { "profile.consultantName": { $regex: searchQuery, $options: "i" } },
          { "profile.fatherName": { $regex: searchQuery, $options: "i" } },
          { "profile.consultantCode": { $regex: searchQuery, $options: "i" } },
          { "profile.primaryMobileNo": { $regex: searchQuery, $options: "i" } },
          { "profile.primaryEmail": { $regex: searchQuery, $options: "i" } },
          { "profile.aadhaarNo": { $regex: searchQuery, $options: "i" } },
          { "profile.panNo": { $regex: searchQuery, $options: "i" } },
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

export const getAllEmployeeSearchQuery = (searchQuery) => {
  let query = {
    $or: [
      { fullName: { $regex: searchQuery, $options: "i" } },
      { email: { $regex: searchQuery, $options: "i" } },
      { mobileNo: { $regex: searchQuery, $options: "i" } },
      { type: { $regex: searchQuery, $options: "i" } },
      { designation: { $regex: searchQuery, $options: "i" } },

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


export const getAllInvoiceQuery = (searchQuery,startDate,endDate,clientId=false,type=false) => {
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

  console.log("my-query", query);
  return { success: true, query: query }
}


export const getDownloadCaseExcel = async (getAllCase = [],notFrom) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'Case From', key: 'caseFrom', width: 20 },
    { header: 'File No', key: 'fileNo', width: 30 },
    { header: 'Current Status', key: 'currentStatus', width: 30 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Father Name', key: 'fatherName', width: 30 },
    { header: 'Mobile No', key: 'mobileNo', width: 30 },
    { header: 'Policy Type', key: 'policyType', width: 30 },
    { header: 'Insurance Company Name', key: 'insuranceCompanyName', width: 30 },
    { header: 'Complaint Type', key: 'complaintType', width: 30 },
    { header: 'Policy No', key: 'policyNo', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'DOB', key: 'DOB', width: 30 },
    { header: 'Pin Code', key: 'pinCode', width: 30 },
    { header: 'claim Amount', key: 'claimAmount', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'Problem Statement', key: 'problemStatement', width: 30 },
  ];

  // Populate Excel rows with data
  getAllCase.forEach((caseData, index) => {
    worksheet.addRow({
      caseFrom: caseData?.caseFrom,
      fileNo: caseData?.fileNo,
      currentStatus: caseData?.currentStatus,
      name: caseData.name,
      fatherName: caseData?.fatherName,
      email: caseData?.email,
      mobileNo: caseData?.mobileNo,
      policyType: caseData?.policyType,
      insuranceCompanyName: caseData?.insuranceCompanyName,
      complaintType: caseData?.complaintType,
      policyNo: caseData?.policyNo,
      address: caseData?.address,
      DOB: caseData?.DOB,
      pinCode: caseData?.pinCode,
      claimAmount: caseData?.claimAmount,
      city: caseData?.city,
      state: caseData?.state,
      problemStatement: caseData?.problemStatement,
    });
  });


  // Generate Excel buffer
  return await workbook.xlsx.writeBuffer();
}

export const getAllPartnerDownloadExcel = async (getAllPartner = [], type = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Consultant Name', key: 'consultantName', width: 20 },
    { header: 'Consultant Code', key: 'consultantCode', width: 30 },
    { header: 'Associate With Us', key: 'associateWithUs', width: 30 },
    { header: 'Work Association', key: 'workAssociation', width: 30 },
    { header: 'Alternate Email', key: 'alternateEmail', width: 30 },
    { header: 'Whatsapp No', key: 'whatsappNo', width: 30 },
    { header: 'Alternate MobileNo', key: 'alternateMobileNo', width: 30 },
    { header: 'PanNo', key: 'panNo', width: 30 },
    { header: 'AadhaarNo', key: 'aadhaarNo', width: 30 },
    { header: 'DOB', key: 'dob', width: 30 },
    { header: 'Area Of Operation', key: 'areaOfOperation', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'District', key: 'district', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'PinCode', key: 'pinCode', width: 30 },
    { header: 'About', key: 'about', width: 30 },
    { header: 'Bank Name', key: 'bankName', width: 30 },
    { header: 'Bank AccountNo', key: 'bankAccountNo', width: 30 },
    { header: 'Bank Branch Name', key: 'bankBranchName', width: 30 },
    { header: 'GSTNo', key: 'gstNo', width: 30 },
    { header: 'PANNo', key: 'panNo', width: 30 },
    { header: 'IFSC Code', key: 'ifscCode', width: 30 },
    { header: 'UPI Id', key: 'upiId', width: 30 },
  ];

  // Populate Excel rows with data
  getAllPartner.forEach((partnerData, index) => {
    worksheet.addRow({
      type: type ? (partnerData?.shareEmployee?.includes(partnerData?.salesId) ? "Added" : "Shared") : partnerData?.salesId ? "Sales" : "Self",
      consultantName: partnerData?.profile?.consultantName,
      consultantCode: partnerData?.profile?.consultantCode,
      associateWithUs: partnerData?.profile?.associateWithUs,
      workAssociation: partnerData?.profile?.workAssociation,
      alternateEmail: partnerData?.profile?.alternateEmail,
      whatsappNo: partnerData?.profile?.whatsupNo,
      alternateMobileNo: partnerData?.profile?.alternateMobileNo,
      panNo: partnerData?.profile?.panNo,
      aadhaarNo: partnerData?.profile?.aadhaarNo,
      dob: partnerData?.profile?.dob,
      gender: partnerData?.profile?.gender,
      areaOfOperation: partnerData?.profile?.areaOfOperation,
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

export const getAllClientDownloadExcel = async (getAllClient = []) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cases');
  // Define Excel columns
  worksheet.columns = [
    { header: 'Name', key: 'consultantName', width: 20 },
    { header: 'Customer Code', key: 'consultantCode', width: 30 },
    { header: 'Associate With Us', key: 'associateWithUs', width: 30 },
    { header: 'Father Name', key: 'fatherName', width: 30 },
    { header: 'Mobile No', key: 'primaryMobileNo', width: 30 },
    { header: 'Email', key: 'primaryEmail', width: 30 },
    { header: 'Whatsapp No', key: 'whatsappNo', width: 30 },
    { header: 'DOB', key: 'dob', width: 30 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'City', key: 'city', width: 30 },
    { header: 'State', key: 'state', width: 30 },
    { header: 'PinCode', key: 'pinCode', width: 30 },
    { header: 'About', key: 'about', width: 30 },
  ];

  // Populate Excel rows with data

  let rowData =
    getAllClient.forEach((partnerData, index) => {
      worksheet.addRow({
        consultantName: partnerData?.profile?.consultantName,
        consultantCode: partnerData?.profile?.consultantCode,
        associateWithUs: partnerData?.profile?.associateWithUs,
        fatherName: partnerData?.profile?.fatherName,
        primaryMobileNo: partnerData?.profile?.primaryMobileNo,
        primaryEmail: partnerData?.profile?.primaryEmail,
        whatsappNo: partnerData?.profile?.whatsupNo,
        dob: partnerData?.profile?.dob,
        address: partnerData?.profile?.address,
        city: partnerData?.profile?.city,
        state: partnerData?.profile?.state,
        pinCode: partnerData?.profile?.pinCode,
        about: partnerData?.profile?.about,
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
        console.error(error);
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