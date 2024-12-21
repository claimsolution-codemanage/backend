import Client from "../models/client.js";
import { validateClientSignUp, validateClientSignIn, validateClientProfileBody, validateAddClientCase } from "../utils/validateClient.js";
import bcrypt from 'bcrypt'
import { sendOTPMail } from "../utils/sendMail.js";
import { authClient } from "../middleware/authentication.js";
import { otp6Digit, sendNotificationAndMail } from '../utils/helper.js'
import Case from "../models/case.js";
import { getAllCaseQuery } from "../utils/helper.js";
import { validMongooseId } from "../utils/helper.js";
import jwt from 'jsonwebtoken'
import { sendForgetPasswordMail, sendAccountTerm_ConditonsMail } from "../utils/sendMail.js";
import { validateResetPassword, validateAddCaseFile, getAllInvoiceQuery, editServiceAgreement } from "../utils/helper.js";
import jwtDecode from 'jwt-decode'
import Admin from "../models/admin.js";
import Bill from "../models/bill.js"
import Tranaction from "../models/transaction.js";
import { encrypt } from "./payment.js";
import { firebaseUpload } from "../utils/helper.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import Notification from "../models/notification.js";
import CasePaymentDetails from "../models/casePaymentDetails.js";

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
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })

    const otp = otp6Digit();
    const client = await Client.find({ mobileNo: req.body.mobileNo });
    const clientWithEmail = await Client.find({ email: req?.body?.email?.trim()?.toLowerCase() })
    const { agreement } = req.body
    if (!agreement) {
      return res.status(400).json({ success: false, message: "Must agree with our service agreement" })
    }

    if (client[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Mobile No. already register with us" })
    if (clientWithEmail[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Email already register with us" });

    // req.body.emailOTP = {otp:otp,createAt:Date.now()}
    const bcrypePassword = await bcrypt.hash(req.body.password, 10)
    if (client.length == 0 && clientWithEmail.length == 0) {
      const newClient = new Client({
        fullName: req.body.fullName,
        email: req?.body?.email?.trim()?.toLowerCase(),
        mobileNo: req.body.mobileNo,
        password: bcrypePassword,
        emailOTP: { otp: otp, createAt: Date.now() },
        acceptClientTls: agreement
      })
      const token = await newClient.getAuth()
      await newClient.save();
      try {
        await sendOTPMail(req.body.email, otp, "client");
        res.status(201).header("x-auth-token", token)
          .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully send OTP" });
      } catch (err) {
        console.log("send otp error", err);
        return res.status(400).json({ success: false, message: "Failed to send OTP" });
      }

    } else {
      if (client?.length > 0) {
        const updateClient = await Client.findByIdAndUpdate(client[0]?._id, {
          $set: {
            fullName: req.body.fullName,
            email: req?.body?.email?.trim()?.toLowerCase(),
            mobileNo: req.body.mobileNo,
            password: bcrypePassword,
            emailOTP: { otp: otp, createAt: Date.now() },
            acceptClientTls: agreement
          }
        })
        const token = await updateClient.getAuth()
        try {
          await sendOTPMail(req.body.email, otp, "client");
          res.status(201).header("x-auth-token", token)
            .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully send OTP" });
        } catch (err) {
          console.log("send otp error", err);
          return res.status(400).json({ success: false, message: "Failed to send OTP" });
        }
      } else if (clientWithEmail.length > 0) {
        const updateClient = await Client.findByIdAndUpdate(clientWithEmail[0]?._id, {
          $set: {
            fullName: req.body.fullName,
            email: req.body.email?.trim()?.toLowerCase(),
            mobileNo: req.body.mobileNo,
            password: bcrypePassword,
            emailOTP: { otp: otp, createAt: Date.now() },
            acceptClientTls: agreement
          }
        })
        const token = await updateClient.getAuth()
        try {
          await sendOTPMail(req.body.email, otp, "client");
          res.status(201).header("x-auth-token", token)
            .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully send OTP" });
        } catch (err) {
          console.log("send otp error", err);
          return res.status(400).json({ success: false, message: "Failed to send OTP" });
        }
      } else {
        return res.status(400).json({ success: false, message: "Account already Exist" });
      }
    }

  } catch (error) {
    console.log("signup error: ", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const signUpWithRequest = async (req, res) => {
  try {
    const { password, agreement, tokenId } = req.body
    if (!password) return res.status(400).json({ success: true, message: "Password is required" })
    if (!agreement) return res.status(400).json({ success: true, message: "Must accept our service agreement" })
    if (!tokenId) return res.status(400).json({ success: true, message: "Invalid/expired link" })
    try {
      await jwt.verify(tokenId, process.env.EMPLOYEE_SECRET_KEY)
      const decode = await jwtDecode(tokenId)
      console.log("decode", decode);
      const bcryptPassword = await bcrypt.hash(password, 10)
      const { clientName, clientEmail, clientMobileNo, empId,empBranchId,caseId } = decode
      if (!clientName || !clientEmail || !clientMobileNo || !empId ||!empBranchId) return res.status(400).json({ success: false, message: "Invalid/expired link" })
      const client = await Client.find({ email: clientEmail })
      if (client[0]?.isActive || client[[0]]?.mobileVerify || client[0]?.emailVerify) return res.status(400).json({ success: false, message: "Account is already exist" })
      const noOfClients = await Client.count()
      const today = new Date()
      const modifiedPdfBytes = await editServiceAgreement("agreement/client.pdf", today)
      await sendAccountTerm_ConditonsMail(clientEmail, "client", modifiedPdfBytes);
      const consultantCode = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfClients+1}`
      const newClient = new Client({
        fullName: clientName,
        email: clientEmail?.trim()?.toLowerCase(),
        mobileNo: `91${clientMobileNo}`,
        password: bcryptPassword,
        emailOTP: { otp: "123456", createAt: Date.now() },
        acceptClientTls: agreement,
        emailVerify: true,
        mobileVerify: true,
        isActive: true,
        tlsUrl: `${process?.env?.FRONTEND_URL}/agreement/client.pdf`,
        "profile.profilePhoto": "",
        "profile.consultantName": clientName,
        "profile.consultantCode": consultantCode,
        "profile.associateWithUs": today,
        "profile.fatherName": "",
        "profile.primaryEmail": clientEmail,
        "profile.alternateEmail": "",
        "profile.primaryMobileNo": clientMobileNo,
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
        salesId: empId,
        branchId:empBranchId?.trim()
      })
      await newClient.save()

      if(caseId){
        if(validMongooseId(caseId)){
          const getCase = await Case.findByIdAndUpdate(caseId,{$set:{
            clientId:newClient?._id?.toString(),
            caseFrom:"client",
            consultantCode:consultantCode
          }})
        }
      }

      const token = newClient?.getAuth(true)
      return res.status(200).header("x-auth-token", token)
        .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully Signup" })
    } catch (error) {
      console.log("error", error);
      return res.status(401).json({ success: false, message: "Invalid/expired link" })
    }
  } catch (error) {
    console.log("signUpWithRequest: ", error);
    return res.status(500).json({ success: false, message: "Oops, something went wrong", error: error });
  }
}

export const clientResendOtp = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(401).json({ success: false, message: "Not SignUp with us" })

    if (client?.mobileVerify || client?.isActive || client?.emailVerify) return res.status(400).json({ success: false, message: "Already register with us" })

    const otp = otp6Digit();
    const updateClient = await Client.findByIdAndUpdate(req?.user?._id, { $set: { emailOTP: { otp: otp, createAt: Date.now() } } })
    if (!updateClient) return res.status(401).json({ success: false, message: "Not SignUp with us" })

    try {
      await sendOTPMail(client?.email, otp, "client");
      res.status(200).json({ success: true, message: "Successfully resend OTP" });
    } catch (err) {
      console.log("send otp error", err);
      return res.status(400).json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.log("resend otp error: ", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

//  for email verification check
export const verifyClientEmailOtp = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(401).json({ success: false, message: "Not register with us" })
    if (client?.mobileVerify) return res.status(400).json({ success: false, message: "Account is already verify" })
    if (!req.body.otp) return res.status(404).json({ success: false, message: "Otp is required" })
    const validFiveMinutes = new Date().getTime() - 5 * 60 * 1000;

    if (new Date(client.emailOTP?.createAt).getTime() >= validFiveMinutes && client.emailOTP?.otp == req?.body?.otp) {
      // const updateClient = await Client.findByIdAndUpdate(client?._id,{$set:{emailVerify:true}})
      //   const token = updateClient?.getAuth()
      //   return  res.status(200).header("x-auth-token", token)
      //   .header("Access-Control-Expose-Headers", "x-auth-token").json({success: true, message: "Account Verified with email"})
      try {
        // const admin = await Admin.find({}).select("-password")
        const today = new Date()
        const modifiedPdfBytes = await editServiceAgreement("agreement/client.pdf", today)
        await sendAccountTerm_ConditonsMail(client?.email, "client", modifiedPdfBytes);
        // await sendAccountTerm_ConditonsMail(client?.email, "client", `${process?.env?.FRONTEND_URL}/agreement/client.pdf`);
        const noOfClients = await Client.count()
        const updateClient = await Client.findByIdAndUpdate(req?.user?._id, {
          $set: {
            emailVerify: false,
            mobileVerify: true,
            acceptClientTls: true,
            isActive: true,
            isProfileCompleted: false,
            tlsUrl: "",
            "profile.profilePhoto": "",
            "profile.consultantName": client.fullName,
            "profile.consultantCode": `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfClients+1}`,
            "profile.associateWithUs": today,
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

          }
        }, { new: true })

        const token = updateClient?.getAuth(true)
        return res.status(200).header("x-auth-token", token)
          .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully Signup" })
      } catch (err) {
        console.log("email verify error", err);
        return res.status(400).json({ success: false, message: "Invaild/expired OTP" });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invaild/expired OTP" })
    }
  } catch (error) {
    console.log("verifyEmailOtp: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

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
      await sendAccountTerm_ConditonsMail(client?.email, `${process.env.FRONTEND_URL}/client/acceptTermsAndConditions/${jwtToken}`, "client", admin[0]?.clientTlsUrl);
      console.log("sendAccountTerm_ConditonsMail client");
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


export const clientsignIn = async (req, res) => {
  try {
    const { error } = validateClientSignIn(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const client = await Client.find({ email: req?.body?.email?.trim()?.toLowerCase() });
    if (client.length == 0) return res.status(404).json({ success: false, message: "invaild email/password" })
    if (!client[0]?.isActive || !client[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Account is not active" })
    // if(!client[0]?.acceptClientTls) return res.status(400).json({success:false,message:"Please accept our TLS first"})
    const validPassword = await bcrypt.compare(req.body.password, client[0].password,)
    if (!validPassword) return res.status(401).json({ success: false, message: "invaild email/password" })
    const updateLoginHistory = await Client.findByIdAndUpdate(client[0]?._id, { $set: { recentLogin: new Date(), lastLogin: client[0]?.recentLogin ? client[0]?.recentLogin : new Date() } })
    const token = client[0]?.getAuth(true)

    return res.status(200).header("x-auth-token", token)
      .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully signIn" })
  } catch (error) {
    console.log("setPassword: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

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

    await Promise.all(req?.body?.caseDocs?.map(async (doc) => {
      const newDoc = new CaseDoc({
        name: doc?.docName,
        type: doc?.docType,
        format: doc?.docFormat,
        url: doc?.docURL,
        clientId: req?.user?._id,
        caseId: newAddCase?._id?.toString(),
      })
      return newDoc.save()
    }))

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
    console.log("updatePartnerCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}



export const viewClientCaseById = async (req, res) => {
  try {
    const verify = await authClient(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const client = await Client.findById(req?.user?._id)
    if (!client) return res.status(401).json({ success: false, message: "Client account not found" })
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    //  console.log("query",query?.query);
    const { _id } = req.query;
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })
    const getCase = await Case.findById(_id).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails")
    if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })
    const getCaseDoc = await CaseDoc.find({ 
      $and: [
        {
          $or: [
            { caseId: getCase?._id },
            { caseMargeId: getCase?._id }
          ]
        },
        {
          $or: [
            { isPrivate: false },
            { isPrivate: { $exists: false } }
          ]
        }
      ],    
  isActive: true }).select("-adminId")
    const getCaseStatus = await CaseStatus.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId")
    const getCasePaymentDetails = await CasePaymentDetails.find({ caseId: getCase?._id, isActive: true })
    const getCaseJson = getCase.toObject()
    getCaseJson.caseDocs = getCaseDoc
    getCaseJson.processSteps = getCaseStatus
    getCaseJson.casePayment = getCasePaymentDetails
    return res.status(200).json({ success: true, message: "get case data", data: getCaseJson });

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
    console.log("query", query);
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
    if (!req.body.email) return res.status(400).json({ success: false, message: "Account email required" })
    const client = await Client.find({ email: req.body.email })
    if (!client[0]?.isActive || !client[0]?.mobileVerify) return res.status(404).json({ success: false, message: "Account not exist" })
    if (client.length == 0) return res.status(404).json({ success: false, message: "Account not exist" })


    const jwtToken = await jwt.sign({ _id: client[0]?._id, email: client[0]?.email }, process.env.CLIENT_SECRET_KEY, { expiresIn: '5m' })
    try {
      await sendForgetPasswordMail(req.body.email, `/client/resetPassword/${jwtToken}`);
      console.log("send forget password client");
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

export const clientResetPassword = async (req, res) => {
  try {
    const { error } = validateResetPassword(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const { password, confirmPassword } = req.body
    if (password != confirmPassword) return res.status(400).json({ success: false, message: "Confirm password must be same" })
    const { verifyId } = req.query
    console.log("verifyId", verifyId);
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

    const { error } = validateAddCaseFile(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    if (!req.body?.docURL) return res.status(400).json({ success: false, message: "Please upload file first" })

    const mycase = await Case.findById(_id)
    if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })
    const addNewDoc = new CaseDoc({
      name: req.body.docName,
      type: req.body.docType,
      format: req.body.docFormat,
      url: req.body.docURL,
      caseId: mycase._id?.toString(),
      clientId: req?.user?._id
    })
    await addNewDoc.save()

    return res.status(200).json({ success: true, message: "Successfully add case file" })


  } catch (error) {
    console.log("updateAdminCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

export const clientDashboard = async (req, res) => {
  try {
    const verify = await authClient(req, res);
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message });

    const client = await Client.findById(req?.user?._id);
    if (!client) return res.status(401).json({ success: false, message: "User account not found" });
    if (!client?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    const clientNeccessaryData = {
      lastLogin: client?.lastLogin,
      recentLogin: client?.recentLogin,
      fullName:client?.fullName
    }

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
          'clientId': req?.user?._id, // Assuming 'clientId' is the field to match
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
          'clientId': req?.user?._id,
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

    return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData, clientNeccessaryData });

  } catch (error) {
    console.log("get dashbaord data error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

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


