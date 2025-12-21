import Client from "../models/client.js";
import { validateClientSignUp, validateClientSignIn, validateClientProfileBody, validateAddClientCase } from "../utils/validateClient.js";
import bcrypt from 'bcrypt'
import { sendMail, } from "../utils/sendMail.js";
import { authClient } from "../middleware/authentication.js";
import { dateOptions, otp6Digit, sendNotificationAndMail } from '../utils/helper.js'
import Case from "../models/case/case.js";
import { getAllCaseQuery } from "../utils/helper.js";
import { validMongooseId } from "../utils/helper.js";
import jwt from 'jsonwebtoken'
import { validateResetPassword, getAllInvoiceQuery } from "../utils/helper.js";
import jwtDecode from 'jwt-decode'
import Admin from "../models/admin.js";
import Bill from "../models/bill.js"
import Tranaction from "../models/transaction.js";
import { encrypt } from "./payment.js";
import { firebaseUpload } from "../utils/helper.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import mongoose, { Types } from "mongoose";
import { accountVerificationTemplate } from "../utils/emailTemplates/accountVerificationTemplate.js";
import { accountTermConditionTemplate } from "../utils/emailTemplates/accountTermConditionTemplate.js";
import { forgetPasswordTemplate } from "../utils/emailTemplates/forgotPasswordTemplate.js";
import { editServiceAgreement } from "../utils/createPdf/serviceAgreement.js";

export const clientUploadImage = async (req, res) => {
  try {
    firebaseUpload(req, res, "images");
  } catch (error) {
    console.log("clientUploadImage", error);
    return res.status(500).json({ success: false, message: "Oops something went wrong" });
  }
}

export const clientUploadAttachment = async (req, res) => {
  try {
    firebaseUpload(req, res, "attachments");
  } catch (error) {
    console.log("clientUploadAttachment", error);
    return res.status(500).json({ success: false, message: "Oops something went wrong" });
  }
}

export const clientAuthenticate = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Account not found" })

    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    return res.status(200).json({ success: true, message: "Authorized Client" })
  } catch (error) {
    console.log("client auth error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

export const clientSignUp = async (req, res) => {
  try {
    const { error } = validateClientSignUp(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { fullName, email, mobileNo, password, agreement } = req.body;
    if (!agreement) {
      return res.status(400).json({ success: false, message: "Must agree with our service agreement" });
    }

    const normalizedEmail = email?.trim()?.toLowerCase();
    const otp = otp6Digit();

    // Check existing clients
    const existingClientByMobile = await Client.findOne({ mobileNo });
    const existingClientByEmail = await Client.findOne({ email: normalizedEmail });

    if (existingClientByMobile?.mobileVerify) {
      return res.status(400).json({ success: false, message: "Mobile No. already registered with us" });
    }
    if (existingClientByEmail?.mobileVerify) {
      return res.status(400).json({ success: false, message: "Email already registered with us" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let clientDoc;
    if (!existingClientByMobile && !existingClientByEmail) {
      // Create new client
      clientDoc = new Client({
        fullName,
        email: normalizedEmail,
        mobileNo,
        password: hashedPassword,
        emailOTP: { otp, createAt: Date.now() },
        acceptClientTls: agreement,
      });
      await clientDoc.save();
    } else {
      // Update existing client (by mobile or email)
      const targetClient = existingClientByMobile || existingClientByEmail;
      clientDoc = await Client.findByIdAndUpdate(
        targetClient._id,
        {
          $set: {
            fullName,
            email: normalizedEmail,
            mobileNo,
            password: hashedPassword,
            emailOTP: { otp, createAt: Date.now() },
            acceptClientTls: agreement,
          },
        },
        { new: true }
      );
    }

    // Generate token
    const token = await clientDoc.getAuth();

    // Send email with OTP
    try {
      await sendMail({
        subject: "Claim Solution Client Account Verification",
        to: normalizedEmail,
        html: accountVerificationTemplate({ name: fullName, otp, type: "Client" }),
      });

      return res
        .status(201)
        .header("x-auth-token", token)
        .header("Access-Control-Expose-Headers", "x-auth-token")
        .json({ success: true, message: "Successfully sent OTP" });
    } catch (mailErr) {
      console.error("send otp error:", mailErr);
      return res.status(400).json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("signup error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};


export const signUpWithRequest = async (req, res) => {
  try {
    const { password, agreement, tokenId } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }
    if (!agreement) {
      return res.status(400).json({ success: false, message: "Must accept our service agreement" });
    }
    if (!tokenId) {
      return res.status(400).json({ success: false, message: "Invalid/expired link" });
    }

    try {
      // ✅ Verify and decode token
      jwt.verify(tokenId, process.env.EMPLOYEE_SECRET_KEY);
      const decode = jwtDecode(tokenId);

      const { clientName, clientEmail, clientMobileNo, empId, empBranchId, caseId } = decode;
      if (!clientName || !clientEmail || !clientMobileNo || !empId || !empBranchId) {
        return res.status(400).json({ success: false, message: "Invalid/expired link" });
      }

      // ✅ Check if client already exists
      const existingClient = await Client.findOne({ email: clientEmail });
      if (existingClient?.isActive || existingClient?.mobileVerify || existingClient?.emailVerify) {
        return res.status(400).json({ success: false, message: "Account already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const date = new Date()
      const today = date?.toLocaleString('en-US', dateOptions)?.split("GMT")?.[0]
      const replacements= { commission: `20%`, signed_on: today }
      
      // ✅ Generate agreement with timestamp
      const modifiedPdfBytes = await editServiceAgreement("agreement/client.pdf", replacements);
        await sendMail({
        subject: "Client Service Agreement",
        to: clientEmail,
        html: accountTermConditionTemplate({as:"Client",name:existingClient?.fullName }),
        attachments:[{
            filename: 'service_agreement.pdf',
            content: modifiedPdfBytes,
            encoding: 'base64'
        }]
      });

      // ✅ Consultant code
      const noOfClients = await Client.countDocuments();
      const consultantCode = `${date?.getFullYear()}${
        date?.getMonth() + 1 < 10 ? `0${date?.getMonth() + 1}` : date?.getMonth() + 1
      }${date?.getDate()}${noOfClients + 1}`;

      // ✅ Create client
      const newClient = new Client({
        fullName: clientName,
        email: clientEmail.trim().toLowerCase(),
        mobileNo: `91${clientMobileNo}`,
        password: hashedPassword,
        emailOTP: { otp: "123456", createAt: Date.now() }, // static OTP placeholder
        acceptClientTls: agreement,
        emailVerify: true,
        mobileVerify: true,
        isActive: true,
        tlsUrl: `${process.env.FRONTEND_URL}/agreement/client.pdf`,
        profile: {
          profilePhoto: "",
          consultantName: clientName,
          consultantCode,
          associateWithUs: date,
          fatherName: "",
          primaryEmail: clientEmail,
          alternateEmail: "",
          primaryMobileNo: clientMobileNo,
          whatsupNo: "",
          alternateMobileNo: "",
          panNo: "",
          aadhaarNo: "",
          dob: "",
          gender: "",
          address: "",
          state: "",
          district: "",
          city: "",
          pinCode: "",
          about: "",
          kycPhoto: "",
          kycAadhar: "",
          kycAadhaarBack: "",
          kycPan: "",
        },
        salesId: empId,
        branchId: empBranchId.trim(),
      });

      await newClient.save();

      // ✅ If linked to a case, update it
      if (caseId && validMongooseId(caseId)) {
        await Case.findByIdAndUpdate(caseId, {
          $set: {
            clientId: newClient._id.toString(),
            clientObjId: newClient._id,
            caseFrom: "client",
            consultantCode,
          },
        });
      }

      // ✅ Issue token
      const token = await newClient.getAuth(true);
      return res
        .status(200)
        .header("x-auth-token", token)
        .header("Access-Control-Expose-Headers", "x-auth-token")
        .json({ success: true, message: "Successfully signed up" });
    } catch (err) {
      console.error("signupWithRequest error:", err);
      return res.status(401).json({ success: false, message: "Invalid/expired link" });
    }
  } catch (error) {
    console.error("signUpWithRequest:", error);
    return res.status(500).json({ success: false, message: "Oops, something went wrong", error });
  }
};

export const clientResendOtp = async (req, res) => {
  try {
    const verify = await authClient(req, res);
    if (!verify.success) {
      return res.status(401).json({ success: false, message: verify.message });
    }

    const client = await Client.findById(req?.user?._id);
    if (!client) {
      return res.status(401).json({ success: false, message: "Not signed up with us" });
    }

    if (client.mobileVerify || client.isActive || client.emailVerify) {
      return res.status(400).json({ success: false, message: "Already registered with us" });
    }

    const otp = otp6Digit();
    const updatedClient = await Client.findByIdAndUpdate(
      req.user._id,
      { $set: { emailOTP: { otp, createAt: Date.now() } } },
      { new: true }
    );

    if (!updatedClient) {
      return res.status(401).json({ success: false, message: "Not signed up with us" });
    }

    try {
      await sendMail({
        subject: "Account Verification - Resend OTP",
        to: client.email,
        html: accountVerificationTemplate({ name: client.fullName, otp, type: "Client" }),
      });

      return res.status(200).json({ success: true, message: "Successfully resent OTP" });
    } catch (err) {
      console.error("send otp error:", err);
      return res.status(400).json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("resend otp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};

//  for email verification check
export const verifyClientEmailOtp = async (req, res) => {
  try {
    // ✅ Authenticate client
    const verify = await authClient(req, res);
    if (!verify.success) {
      return res.status(401).json({ success: false, message: verify.message });
    }

    const client = await Client.findById(req?.user?._id);
    if (!client) {
      return res.status(401).json({ success: false, message: "Not registered with us" });
    }

    if (client.mobileVerify) {
      return res.status(400).json({ success: false, message: "Account is already verified" });
    }

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    // ✅ OTP validity: 5 minutes
    const otpValidFrom = Date.now() - 5 * 60 * 1000;
    const otpCreatedAt = new Date(client.emailOTP?.createAt).getTime();
    const isOtpValid = otpCreatedAt >= otpValidFrom && client.emailOTP?.otp == otp;

    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    try {
      const date = new Date()
      const today = date?.toLocaleString('en-US', dateOptions)?.split("GMT")?.[0]
      const replacements= { commission: `20%`, signed_on: today }

      // ✅ Generate agreement with timestamp
      const modifiedPdfBytes = await editServiceAgreement("agreement/client.pdf", replacements);
        await sendMail({
        subject: "Client Service Agreement",
        to: client.email,
        html: accountTermConditionTemplate({as:"Client",name:client?.fullName }),
        attachments:[{
            filename: 'service_agreement.pdf',
            content: modifiedPdfBytes,
            encoding: 'base64'
        }]
      });

      // ✅ Generate consultant code
      const noOfClients = await Client.countDocuments();
      const consultantCode = `${date.getFullYear()}${
        date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
      }${date.getDate()}${noOfClients + 1}`;

      // ✅ Update client profile
      const updatedClient = await Client.findByIdAndUpdate(
        client._id,
        {
          $set: {
            emailVerify: false,
            mobileVerify: true,
            acceptClientTls: true,
            isActive: true,
            isProfileCompleted: false,
            tlsUrl: "",
            "profile.profilePhoto": "",
            "profile.consultantName": client.fullName,
            "profile.consultantCode": consultantCode,
            "profile.associateWithUs": date,
            "profile.fatherName": "",
            "profile.primaryEmail": client.email,
            "profile.alternateEmail": "",
            "profile.primaryMobileNo": client.mobileNo,
            "profile.whatsupNo": "",
            "profile.alternateMobileNo": "",
            "profile.panNo": "",
            "profile.aadhaarNo": "",
            "profile.dob": "",
            "profile.gender": "",
            "profile.address": "",
            "profile.state": "",
            "profile.district": "",
            "profile.city": "",
            "profile.pinCode": "",
            "profile.about": "",
            "profile.kycPhoto": "",
            "profile.kycAadhar": "",
            "profile.kycAadhaarBack": "",
            "profile.kycPan": "",
          },
        },
        { new: true }
      );

      // ✅ Generate token
      const token = await updatedClient.getAuth(true);

      return res
        .status(200)
        .header("x-auth-token", token)
        .header("Access-Control-Expose-Headers", "x-auth-token")
        .json({ success: true, message: "Successfully signed up" });
    } catch (err) {
      console.error("email verify error:", err);
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }
  } catch (error) {
    console.error("verifyEmailOtp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};


export const clientSendMobileOtpCode = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
    if (client.acceptClientTls) return res.status(400).json({ success: false, message: "Account Already verified" })
    if (!client.emailVerify) return res.status(400).json({ success: false, message: "Account not verified with mail" })
    const { mobileNo } = req.body
    if (!mobileNo) return res.status(400).json({ success: false, message: "MobileNo. required" })
    if (mobileNo !== client.mobileNo) return res.status(400).json({ success: false, message: "MobileNo. not match with account" })
    return res.status(200).json({ success: true, message: "Sending otp on mobile" })

  } catch (error) {
    console.log("clientSendMobileOtpCode: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


export const clientMobileNoVerify = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
    if (client.acceptClientTls) return res.status(400).json({ success: false, message: "Account Already verified" })
    if (!client.emailVerify) return res.status(400).json({ success: false, message: "Account not verified with mail" })
    try {
      const updateClient = await Client.findByIdAndUpdate(req?.user?._id, { $set: { mobileVerify: true } })
      const admin = await Admin.find({}).select("-password")
      const jwtToken = await jwt.sign({ _id: client?._id, email: client?.email }, process.env.CLIENT_SECRET_KEY, { expiresIn: '6h' })
      res.status(200).json({ success: true, message: "Please check your mail" });
    } catch (err) {
      console.log("send forget password mail error", err);
      return res.status(400).json({ success: false, message: "Failed to send mail to activate account" });
    }
  } catch (error) {
    console.log("clientMobileNoVerify: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


export const acceptClientTerms_Conditions = async (req, res) => {
  try {
    try {
      const { verifyId } = req.query
      await jwt.verify(verifyId, process.env.CLIENT_SECRET_KEY)
      const decode = await jwtDecode(verifyId)
      const client = await Client.findById(decode?._id);
      if (!client) return res.status(401).json({ success: false, message: "Not register with us" })
      if (client.acceptClientTerms_Conditions) return res.status(401).json({ success: false, message: "Account Already verified" })
      if (!client?.emailVerify || !client?.mobileVerify) return res.status(400).json({ success: false, message: "Account not verified with mail or mobile" })
      const admin = await Admin.find({}).select("-password")
      const noOfClients = await Client.count()
      const updateClient = await Client.findByIdAndUpdate(client?._id, {
        $set: {
          acceptClientTls: true, isActive: true,
          tlsUrl: admin[0]?.clientTlsUrl,
          "profile.profilePhoto": "",
          "profile.consultantName": client.fullName,
          "profile.consultantCode": `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfClients}`,
          "profile.associateWithUs": new Date(),
          "profile.fatherName": "",
          "profile.primaryEmail": client.email,
          "profile.alternateEmail": "",
          "profile.primaryMobileNo": client.mobileNo,
          "profile.whatsupNo": "",
          "profile.alternateMobileNo": "",
          "profile.panNo": "",
          "profile.aadhaarNo": "",
          "profile.dob": "",
          "profile.gender": "",
          "profile.address": "",
          "profile.state": "",
          "profile.district": "",
          "profile.city": "",
          "profile.pinCode": "",
          "profile.about": "",
        }
      }, { new: true })
      return res.status(200).json({ success: true, message: "Thanks for being our client" })
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid/expired acception" })
    }
  } catch (error) {
    console.log("clientMobileNoVerify: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const clientTls = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    return res.status(200).json({ success: true, message: "Successfully get client tls", data: client?.tlsUrl })


  } catch (error) {
    console.log("partnerTls error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

export const clientSignIn = async (req, res) => {
  try {
    // ✅ Validate input
    const { error } = validateClientSignIn(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const email = req.body?.email?.trim()?.toLowerCase();
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ success: false, message: "Invalid email or password" });
    }

    if (!client.isActive || !client.mobileVerify) {
      return res.status(400).json({ success: false, message: "Account is not active" });
    }

    const validPassword = await bcrypt.compare(req.body.password, client.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // ✅ Update login history
    await Client.findByIdAndUpdate(
      client._id,
      {
        $set: {
          recentLogin: new Date(),
          lastLogin: client.recentLogin || new Date(),
        },
      }
    );

    // ✅ Generate token
    const token = await client.getAuth(true);

    return res
      .status(200)
      .header("x-auth-token", token)
      .header("Access-Control-Expose-Headers", "x-auth-token")
      .json({ success: true, message: "Successfully signed in" });
  } catch (error) {
    console.error("signIn error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};


export const getClientProfile = async (req, res, next) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const client = await Client.findById(req?.user?._id).select("-password");
    if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!client?.isActive && client?.isLogin) return res.status(400).json({ success: false, message: "Account is not active" })


    return res.status(200).json({ success: true, message: "Successfully get profile details", data: client })
  } catch (error) {
    console.log("updateClientDetails: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const updateClientProfile = async (req, res, next) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!client?.isActive && client?.isLogin) return res.status(400).json({ success: false, message: "Account is not active" })
    const { error } = validateClientProfileBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const updateClientDetails = await Client.findByIdAndUpdate(req?.user?._id, {
      $set: {
        isProfileCompleted: true,
        "profile.profilePhoto": req.body.profilePhoto,
        "profile.consultantName": req.body.consultantName,
        "profile.fatherName": req.body.fatherName,
        "profile.alternateEmail": req.body.alternateEmail,
        "profile.primaryMobileNo": req.body.mobileNo,
        "profile.whatsupNo": req.body.whatsupNo,
        "profile.alternateMobileNo": req.body.alternateMobileNo,
        "profile.dob": req.body.dob,
        "profile.address": req.body.address,
        "profile.state": req.body.state,
        "profile.city": req.body.city,
        "profile.pinCode": req.body.pinCode,
        "profile.about": req.body.about,
        "profile.kycPhoto": req.body?.kycPhoto,
        "profile.kycAadhaar": req.body?.kycAadhaar,
        "profile.kycAadhaarBack": req?.body?.kycAadhaarBack,
        "profile.kycPan": req.body.kycPan,
      }
    }, { new: true })
    const token = updateClientDetails?.getAuth(true)
    return res.status(200).json({ success: true, message: "Successfully Update profile details", token: token })
  } catch (error) {
    console.log("updateClientDetails: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

// add new case
export const addNewClientCase = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!client?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })
    const { error } = validateAddClientCase(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const { admin } = await Admin.find({ email: process.env.ADMIN_MAIL_ID })
    // console.log("admin",admin);
    const caseFees = admin?.length > 0 ? (admin[0]?.consultantFee ? admin[0].consultantFee : 2000) : 2000
    req.body.consultantCode = client?.profile?.consultantCode
    req.body.clientId = client?._id
    req.body.clientObjId = client?._id
    req.body.caseFrom = "client"
    // req.body.acceptPayment = true
    // req.body.pendingPayment = true
    req.body.processSteps = []
    const newAddCase = new Case({ ...req.body, caseDocs: [],branchId:client?.branchId })
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
            clientId: req?.user?._id,
            caseId: newAddCase?._id?.toString(),
          }
        }
      });
    });
    bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

    // send notification through email and db notification
    const notificationEmpUrl = `/employee/view case/${newAddCase?._id?.toString()}`
    const notificationAdminUrl = `/admin/view case/${newAddCase?._id?.toString()}`

    sendNotificationAndMail(
      newAddCase?._id?.toString(),
      `Client added new Case file No. ${newAddCase?.fileNo}`,
      newAddCase?.branchId || "",
      "",
      notificationEmpUrl,
      notificationAdminUrl
    )

    return res.status(201).json({ success: true, message: "Successfully add new case", data: newAddCase })
  } catch (error) {
    console.log("addNewCase: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


export const clientUpdateCaseById = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })


    const { _id } = req.query
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const mycase = await Case.find({ _id: _id, clientId: client?._id })
    if (mycase.length == 0) return res.status(404).json({ success: false, message: "Case not found" })

    const { error } = validateAddClientCase(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })

    // req.body.caseDocs = req?.body?.caseDocs?.map(caseFile => {
    //   return {
    //     docDate: caseFile?.docDate ? caseFile?.docDate : new Date(),
    //     docName: caseFile?.docName,
    //     docType: caseFile?.docFormat,
    //     docFormat: caseFile?.docFormat,
    //     docURL: caseFile?.docURL,
    //   }
    // })


    const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body,caseDocs:[] } }, { new: true })
    return res.status(200).json({ success: true, message: "Successfully update case", data: updateCase });

  } catch (error) {
    console.log("updatePartnerCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}



export const viewClientCaseById = async (req, res) => {
  try {
    const {_id} = req.query
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    //  console.log("query",query?.query);
if (!validMongooseId(_id)) {
      return res.status(400).json({ success: false, message: "Not a valid id" });
    }

    const [caseData] = await Case.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(_id) } },
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
                    {
                      $or: [
                        { $eq: ["$caseId", "$$caseId"] },
                        { $eq: ["$caseMargeId", { $toString: "$$caseId" }] },
                        { $ne: ["$isPrivate", true] },
                      ]
                    },
                    {
                      $or: [
                        { $eq: ["$isPrivate", false] },
                        { $not: { $ifNull: ["$isPrivate", false] } }
                      ]
                    }
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
                    {
                      $or: [
                        { $eq: ["$caseId", "$$caseId"] },
                        { $eq: ["$caseMargeId", { $toString: "$$caseId" }] }
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
          from: "casepaymentdetails",
          let: { caseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $eq: ["$caseId", "$$caseId"] }
                  ]
                }
              }
            }
          ],
          as: "casePayment"
        }
      },
      {
        $project: {
          addEmployee: 0,
          partnerReferenceCaseDetails: 0,
          caseCommit: 0
        }
      },  {
            $lookup: {
               from: "case_forms",
               localField: "_id",
               foreignField: "caseId",
               pipeline: [
                  { $match: { isActive: true } },
                  { $project: { formType: 1,caseId:1 } },
               ],
               as: "case_forms"
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
    console.log("get all client case in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const viewClientAllCase = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    // query = ?statusType=&search=&limit=&pageNo
    const pageItemLimit = req.query.limit ? req.query.limit : 10;
    const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
    const searchQuery = req.query.search ? req.query.search : "";
    const statusType = req.query.status ? req.query.status : "";
    const startDate = req.query.startDate ? req.query.startDate : "";
    const endDate = req.query.endDate ? req.query.endDate : "";

    const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, false, req?.user?._id, false, true)
    // console.log("query", query?.query );
    if (!query.success) return res.status(400).json({ success: false, message: query.message })

    //  console.log("query",query?.query);
    const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
    const noOfCase = await Case.find(query?.query).count()
    const aggregationPipeline = [
      { $match: query?.query }, // Match the documents based on the query
      {
         $group: {
            _id: null,
            totalAmtSum: { $sum: "$claimAmount" }, // Calculate the sum of totalAmt
         }
      }
   ];
   const aggregateResult = await Case.aggregate(aggregationPipeline);
    return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase,totalAmt:aggregateResult });

  } catch (error) {
    console.log("get all client case in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const clientForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Account email required" });
    }

    const client = await Client.findOne({ email: email.trim().toLowerCase() });
    if (!client || !client.isActive || !client.mobileVerify) {
      return res.status(404).json({ success: false, message: "Account does not exist" });
    }

    // ✅ Generate JWT token valid for 5 minutes
    const jwtToken = jwt.sign(
      { _id: client._id, email: client.email },
      process.env.CLIENT_SECRET_KEY,
      { expiresIn: "5m" }
    );

    try {
      await sendMail({
        subject: "Password Reset",
        to: client.email,
        html: forgetPasswordTemplate({
          email: client.email,
          name: client.fullName,
          link: `/client/resetPassword/${jwtToken}`,
        }),
      });

      console.log("Forget password email sent to client:", client.email);
      return res.status(201).json({ success: true, message: "Forget password email sent successfully" });
    } catch (mailErr) {
      console.error("Error sending forget password mail:", mailErr);
      return res.status(400).json({ success: false, message: "Failed to send forget password mail" });
    }
  } catch (error) {
    console.error("clientForgetPassword error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};

export const clientResetPassword = async (req, res) => {
  try {
    const { error } = validateResetPassword(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const { password, confirmPassword } = req.body
    if (password != confirmPassword) return res.status(400).json({ success: false, message: "Confirm password must be same" })
    const { verifyId } = req.query
    try {
      await jwt.verify(verifyId, process.env.CLIENT_SECRET_KEY)
      const decode = await jwtDecode(verifyId)
      const bcryptPassword = await bcrypt.hash(req.body.password, 10)
      const client = await Client.findById(decode?._id)
      if (!client?.isActive || !client?.mobileVerify) return res.status(404).json({ success: false, message: "Account is not active" })
      const forgetPasswordClient = await Client.findByIdAndUpdate(decode?._id, { $set: { password: bcryptPassword } })
      if (!forgetPasswordClient) return res.status(404).json({ success: false, message: "Account not exist" })
      return res.status(200).json({ success: true, message: "Successfully reset password" })
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid/expired link" })
    }

  } catch (error) {
    console.log("get all client case in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const clientAddCaseFile = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    const { _id } = req.query
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

    const mycase = await Case.findById(_id)
    if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })

    let bulkOps = [];
    (req?.body?.caseDocs || [])?.forEach((doc) => {
      bulkOps.push({
        insertOne: {
          document: {
            name: doc?.docName,
            type: doc?.docType,
            format: doc?.docFormat,
            url: doc?.docURL,
            caseId: mycase._id?.toString(),
            clientId: req?.user?._id
          }
        }
      });
    });
    bulkOps?.length && await CaseDoc.bulkWrite(bulkOps)

    return res.status(200).json({ success: true, message: "Successfully add case file" })
  } catch (error) {
    console.log("updateAdminCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

// export const clientDashboard = async (req, res) => {
//   try {
//     const year = Number(req.query.year || new Date().getFullYear())
//     const verify = await authClient(req, res);
//     if (!verify.success) return res.status(401).json({ success: false, message: verify.message });

//     const client = await Client.findById(req?.user?._id);
//     if (!client) return res.status(401).json({ success: false, message: "User account not found" });
//     if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

//     const clientNeccessaryData = {
//       lastLogin: client?.lastLogin,
//       recentLogin: client?.recentLogin,
//       fullName:client?.fullName
//     }

//     let currentYear = new Date().getFullYear()
//     const currentYearStart = new Date(new Date(new Date().setFullYear(year ||  currentYear)).getFullYear(), 0, 1); // Start of the current year
//     const endYearStart = new Date(new Date(new Date().setFullYear((year ||  currentYear)+1)).getFullYear(), 0, 1); // Start of the current year
//     const currentMonth = year==currentYear ?  new Date().getMonth() + 1 : 12;
//     const allMonths = [];
//     for (let i = 0; i < currentMonth; i++) {
//       allMonths.push({
//         _id: {
//           year: year || new Date().getFullYear(),
//           month: i + 1
//         },
//         totalCases: 0
//       });
//     }
 
//     console.log("start",currentYearStart,endYearStart);
    
    
//     const pieChartData = await Case.aggregate([
//       {
//         '$match': {
//           'createdAt': { $gte: currentYearStart },
//           'createdAt': { $lte: endYearStart },
//           'clientObjId': new Types.ObjectId(req?.user?._id), // Assuming 'clientId' is the field to match
//           'isActive': true,
//           'isPartnerReferenceCase': false,
//           'isEmpSaleReferenceCase': false,
//         }
//       },
//       {
//         '$group': {
//           '_id': '$currentStatus',
//           'totalCases': {
//             '$sum': 1
//           },
//           'totalCaseAmount': {
//             '$sum': '$claimAmount' // Assuming 'amount' is the field to sum
//           }
//         }
//       },
//       {
//         '$group': {
//           '_id': null,
//           'totalCase': {
//             '$sum': '$totalCases'
//           },
//           'totalCaseAmount': {
//             '$sum': '$totalCaseAmount'
//           },
//           'allCase': {
//             '$push': '$$ROOT'
//           }
//         }
//       }
//     ]);

//     const graphData = await Case.aggregate([
//       {
//         $match: {
//           'createdAt': { $gte: currentYearStart },
//           'createdAt': { $lte: endYearStart },
//           'clientObjId': new Types.ObjectId(req?.user?._id),
//           'isActive': true,
//           'isPartnerReferenceCase': false,
//           'isEmpSaleReferenceCase': false,
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
//         $sort: { '_id.year': 1, '_id.month': 1 }
//       },])

//     // Merge aggregated data with the array representing all months
//     const mergedGraphData = allMonths.map((month) => {
//       const match = graphData.find((data) => {
//         return data._id.year === month._id.year && data._id.month === month._id.month;
//       });
//       return match || month;
//     });

//     return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData, clientNeccessaryData });

//   } catch (error) {
//     console.log("get dashbaord data error:", error);
//     res.status(500).json({ success: false, message: "Internal server error", error: error });

//   }
// };


export const clientDashboard = async (req, res) => {
  try {
    // const year = Number(req.query.year || new Date().getFullYear());

    const verify = await authClient(req, res);
    if (!verify.success)
      return res.status(401).json({ success: false, message: verify.message });

    const client = await Client.findById(req?.user?._id);
    if (!client)
      return res.status(401).json({ success: false, message: "User account not found" });

    if (!client?.isActive)
      return res.status(401).json({ success: false, message: "Account is not active" });

    const clientNeccessaryData = {
      lastLogin: client?.lastLogin,
      recentLogin: client?.recentLogin,
      fullName: client?.fullName,
    };

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

    // Get case distribution by currentStatus (for pie chart)
    const pieChartData = await Case.aggregate([
      {
        $match: {
          createdAt: {
            $gte: financialYearStart,
            $lte: financialYearEnd,
          },
          clientObjId: new Types.ObjectId(req?.user?._id),
          isActive: true,
          isPartnerReferenceCase: false,
          isEmpSaleReferenceCase: false,
        }
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
        $match: {
          createdAt: {
            $gte: financialYearStart,
            $lte: financialYearEnd,
          },
          clientObjId: new Types.ObjectId(req?.user?._id),
          isActive: true,
          isPartnerReferenceCase: false,
          isEmpSaleReferenceCase: false,
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
      clientNeccessaryData
    });

  } catch (error) {
    console.error("get dashboard data error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error });
  }
};

export const clientViewAllInvoice = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account not active" })


    const pageItemLimit = req.query.limit ? req.query.limit : 10;
    const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
    const searchQuery = req.query.search ? req.query.search : "";
    const startDate = req.query.startDate ? req.query.startDate : "";
    const endDate = req.query.endDate ? req.query.endDate : "";

    const query = getAllInvoiceQuery(searchQuery, startDate, endDate, req?.user?._id, true)
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
    console.log("employee-get invoice in error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const clientViewInvoiceById = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account not active" })

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

export const clientPayInvoiceById = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account not active" })

    const { invoiceId, caseId } = req.query;
    if (!validMongooseId(invoiceId) && !validMongooseId(caseId)) return res.status(400).json({ success: false, message: "Case or invoice id is not valid" })

    const getInvoice = await Bill.findById(invoiceId)
    if (!getInvoice) return res.status(404).json({ success: false, message: "Invoice not found" })

    const getCase = await Case.findById(caseId)
    if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })
    const newTransaction = new Tranaction({ clientId: req?.user?._id, invoiceId: invoiceId, caseId: caseId })

    const paymentStr = "payerName=" + client?.profile?.consultantName.trim() +
      "&payerEmail=" + client?.profile?.primaryEmail.trim() + "&payerMobile=" +
      client?.profile?.primaryMobileNo.trim() +
      "&clientTxnId=" + newTransaction?._id + "&amount=" + getInvoice?.totalAmt + "&clientCode=" +
      process?.env?.CLIENTCODE.trim() + "&transUserName=" + process?.env?.TRANSUSERNAME.trim() + "&transUserPassword=" +
      process?.env?.TRANSUSERPASSWORD.trim() + "&callbackUrl=" + process?.env?.CALLBACKURL.trim() + "&amountType=" +
      "INR" + "&mcc=" + process?.env?.MCC.trim() + "&channelId=" + "W".trim() + "&transDate=" + new Date().getTime()

    console.log("paymentStr", paymentStr);

    const encData = encrypt(paymentStr?.trim())
    await newTransaction.save()


    return res.status(200).json({ success: true, message: "transaction create", tranactionId: newTransaction?._id, encData: encData, clientCode: process?.env?.CLIENTCODE.trim() });



  } catch (error) {
    console.log("employeeViewPartnerById in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}


