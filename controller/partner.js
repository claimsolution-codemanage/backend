import Partner from "../models/partner.js";
import {
  validateSignUp, validateUpdateBody, validateBankingDetailsBody, validateProfileBody, validateNewPassword, validateSignIn,
  validateAddCase

} from "../utils/validatePatner.js";
import { otp6Digit, getAllCaseQuery, getDownloadCaseExcel, partnerGetDownloadCaseExcel, getValidateDate, sendNotificationAndMail } from "../utils/helper.js";
import { sendOTPMail, sendForgetPasswordMail } from '../utils/sendMail.js'
import { authPartner } from "../middleware/authentication.js";
import bcrypt from 'bcrypt'
import Case from "../models/case.js";
import { validMongooseId, validateResetPassword, validateAddCaseFile } from "../utils/helper.js";
import jwt from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import Admin from "../models/admin.js";
import { sendAccountTerm_ConditonsMail } from "../utils/sendMail.js";
import { editServiceAgreement } from "../utils/helper.js";
import { firebaseUpload } from "../utils/helper.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import Statement from "../models/statement.js";
import Notification from "../models/notification.js";
import CasePaymentDetails from "../models/casePaymentDetails.js";
import CasegroStatus from "../models/groStatus.js";
import CaseOmbudsmanStatus from "../models/ombudsmanStatus.js";
import { Types } from "mongoose";




export const partnerAuthenticate = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Account not found" })

    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    return res.status(200).json({ success: true, message: "Authorized partner" })
  } catch (error) {
    console.log("partner auth error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}


export const partnerUploadImage = async (req, res) => {
  try {
    firebaseUpload(req, res, "images");
  } catch (error) {
    console.log("partnerUploadImage", error);
    return res.status(500).json({ success: false, message: "Oops something went wrong" });
  }
}

export const partnerUploadAttachment = async (req, res) => {
  try {
    firebaseUpload(req, res, "attachments");
  } catch (error) {
    console.log("partnerUploadAttachment", error);
    return res.status(500).json({ success: false, message: "Oops something went wrong" });
  }
}



//  for create new account
export const signUp = async function (req, res) {
  try {
    const { error } = validateSignUp(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })

    const otp = otp6Digit();
    const partner = await Partner.find({ email: req?.body?.email?.trim()?.toLowerCase() });
    //  const partnerWithEmail = await Partner.find({email:req.body.email})
    const { agreement } = req.body
    if (!agreement) {
      return res.status(400).json({ success: false, message: "Must agree with our service agreement" })
    }

    if (partner[0]?.emailVerify || partner[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Email already register with us" })
    //  if (partnerWithEmail[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Email already register with us" });
    const bcrypePassword = await bcrypt.hash(req.body.password, 10)
    if (partner.length == 0) {
      const newPartner = new Partner({
        fullName: req.body.fullName,
        email: req?.body?.email?.trim()?.toLowerCase(),
        mobileNo: req.body.mobileNo,
        workAssociation: req.body.workAssociation,
        areaOfOperation: req.body.areaOfOperation,
        password: bcrypePassword,
        emailOTP: { otp: otp, createAt: Date.now() },
        //  acceptPartnerTls:agreement,
        acceptTnc: agreement
      })
      await newPartner.save();
      const token = await newPartner.getAuth()
      try {
        await sendOTPMail(req.body.email, otp, "partner");
        return res.status(201).header("x-auth-token", token)
          .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully send OTP" });
      } catch (err) {
        console.log("send otp error", err);
        return res.status(400).json({ success: false, message: "Failed to send OTP" });
      }

    } else {
      //  else block for already filled details
      console.log("else block");
      if (partner?.length > 0) {
        const updatePatner = await Partner.findByIdAndUpdate(partner[0]?._id, {
          $set: {
            fullName: req.body.fullName,
            email: req?.body?.email?.trim()?.toLowerCase(),
            mobileNo: req.body.mobileNo,
            workAssociation: req.body.workAssociation,
            areaOfOperation: req.body.areaOfOperation,
            partnerType: req.body.partnerType,
            password: bcrypePassword,
            emailOTP: { otp: otp, createAt: Date.now() },
            // acceptPartnerTls:agreement,
            acceptTnc: agreement
          }
        })
        const token = await updatePatner.getAuth()
        try {
          await sendOTPMail(req.body.email, otp, "partner");
          res.status(201).header("x-auth-token", token)
            .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully send OTP" });
        } catch (err) {
          console.log("send otp error", err);
          return res.status(400).json({ success: false, message: "Failed to send OTP" });
        }
      }
      return res.status(400).json({ success: false, message: "Failed to send OTP" });
      // if(partnerWithEmail.length>0){
      //   const updatePatner = await Partner.findByIdAndUpdate(partnerWithEmail[0]?._id,{
      //     $set:{
      //       fullName: req.body.fullName,
      //       email: req.body.email,
      //       mobileNo: req.body.mobileNo,
      //       workAssociation: req.body.workAssociation,
      //       areaOfOperation: req.body.areaOfOperation,
      //       partnerType:req.body.partnerType,
      //       password:bcrypePassword,
      //       emailOTP: {otp:otp,createAt:Date.now()},
      //       acceptPartnerTls:agreement
      //     }})
      //   const token = await updatePatner.getAuth()
      //   try {
      //     await sendOTPMail(req.body.email, otp,"partner");
      //     res.status(201).header("x-auth-token", token)
      //     .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully send OTP"});
      //  } catch (err) {
      //   console.log("send otp error",err);
      //     return res.status(400).json({ success: false, message: "Failed to send OTP" });
      //  }
      // }

    }

  } catch (error) {
    console.log("signup error: ", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

//  at time of signup
export const partnerResendOtp = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(401).json({ success: false, message: "Not SignUp with us" })

    if (partner?.mobileVerify || partner?.isActive || partner?.emailVerify) return res.status(400).json({ success: false, message: "Already register with us" })

    const otp = otp6Digit();
    const updatepartner = await Partner.findByIdAndUpdate(req?.user?._id, { $set: { emailOTP: { otp: otp, createAt: Date.now() } } })
    if (!updatepartner) return res.status(401).json({ success: false, message: "Not SignUp with us" })

    try {
      await sendOTPMail(partner?.email, otp, "partner");
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

// const testPdfMail = async()=>{
//   try {
//     const today = new Date()
//     const modifiedPdfBytes = await editServiceAgreement("agreement/partner.pdf",today)
//     await sendAccountTerm_ConditonsMail("anil-emp@yopmail.com", "partner", modifiedPdfBytes);
//     console.log("send testPdf");
//   } catch (error) {
//     console.log("testpdfMail error:",error);
//   }
// }

// testPdfMail()

//  for email verification check
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const verify = await authPartner(req, res, next)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(401).json({ success: false, message: "Not register with us" })
    if (partner?.mobileVerify || partner?.emailVerify) return res.status(400).json({ success: false, message: "Account is already verify" })
    if (!req.body.otp) return res.status(404).json({ success: false, message: "Otp is required" })
    const validFiveMinutes = new Date().getTime() - 5 * 60 * 1000;

    if (new Date(partner.emailOTP?.createAt).getTime() >= validFiveMinutes && partner.emailOTP?.otp == req?.body?.otp) {
      console.log(new Date(partner.emailOTP?.createAt).getTime(), validFiveMinutes);
      try {
        const today = new Date()
        const modifiedPdfBytes =await editServiceAgreement("agreement/partner.pdf", today)
        await sendAccountTerm_ConditonsMail(partner?.email, "partner", modifiedPdfBytes);
        const noOfPartners = await Partner.count()
        const updatePartner = await Partner.findByIdAndUpdate(req?.user?._id, {
          $set: {
            emailVerify: true,
            mobileVerify: true,
            // acceptPartnerTls:true,
            isActive: true,
            tlsUrl: `${process?.env?.FRONTEND_URL}/agreement/partner.pdf`,
            profile: {
              profilePhoto: "",
              consultantName: partner?.fullName,
              consultantCode: `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfPartners+1}`,
              associateWithUs: today,
              primaryEmail: partner?.email,
              alternateEmail: "",
              primaryMobileNo: partner?.mobileNo,
              alternateMobileNo: "",
              whatsupNo: "",
              panNo: "",
              aadhaarNo: "",
              dob: null,
              gender: "",
              businessName: "",
              companyName: "",
              natureOfBusiness: "",
              designation: "",
              areaOfOperation: partner?.areaOfOperation,
              workAssociation: partner?.workAssociation,
              state: "",
              district: "",
              city: "",
              pinCode: "",
              about: "",
              kycPhoto:"",
              kycAadhaar:"",
              kycAadhaarBack:"",
              kycPan:"",
            },
            bankingDetails: {
              bankName: "",
              bankAccountNo: "",
              bankBranchName: "",
              gstNo: "",
              panNo: "",
              cancelledChequeImg: "",
              gstCopyImg: "",
            },
          }
        }, { new: true })

        const token = updatePartner?.getAuth(true)
        return res.status(200).header("x-auth-token", token)
          .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully Signup" })
      } catch (err) {
        console.log("send forget password mail error", err);
        return res.status(400).json({ success: false, message: "Invaild/expired OTP" });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invaild/expired OTP" })
    }
    // res.status(400).json({success: true, message: "valid otp"})
  } catch (error) {
    console.log("verifyEmailOtp: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


export const partnerSendMobileOtpCode = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(401).json({ success: false, message: "Not register with us" })
    if (partner.acceptPartnerTls) return res.status(401).json({ success: false, message: "Account Already verified" })
    if (!partner.emailVerify) return res.status(401).json({ success: false, message: "Account not verified with mail" })
    const { mobileNo } = req.body
    if (!mobileNo) return res.status(400).json({ success: false, message: "MobileNo. required" })
    if (mobileNo !== partner.mobileNo) return res.status(400).json({ success: false, message: "MobileNo. not match with account" })
    return res.status(200).json({ success: true, message: "Sending otp on mobile" })

  } catch (error) {
    console.log("partnerSendMobileOtpCode: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


export const partnerMobileNoVerify = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(401).json({ success: false, message: "Not register with us" })
    if (partner.acceptPartnerTls) return res.status(401).json({ success: false, message: "Account Already verified" })
    if (!partner.emailVerify) return res.status(400).json({ success: false, message: "Account not verified with mail" })
    try {
      const updatePartner = await Partner.findByIdAndUpdate(req?.user?._id, { $set: { mobileVerify: true } })
      const admin = await Admin.find({}).select("-password")
      const jwtToken = await jwt.sign({ _id: partner?._id, email: partner?.email }, process.env.PARTNER_SECRET_KEY, { expiresIn: '6h' })
      await sendAccountTerm_ConditonsMail(partner?.email, `${process.env.FRONTEND_URL}/partner/acceptTermsAndConditions/${jwtToken}`, "partner", admin[0]?.partnerTlsUrl);
      console.log("sendAccountTerm_ConditonsMail partner");
      res.status(200).json({ success: true, message: "Please check your mail" });
    } catch (err) {
      console.log("send forget password mail error", err);
      return res.status(400).json({ success: false, message: "Failed to send mail to activate account" });
    }
  } catch (error) {
    console.log("partnerMobileNoVerify: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const acceptPartnerTerms_Conditions = async (req, res) => {
  try {
    try {
      const { verifyId } = req.query
      await jwt.verify(verifyId, process.env.PARTNER_SECRET_KEY)
      const decode = await jwtDecode(verifyId)
      const partner = await Partner.findById(decode?._id);
      if (!partner) return res.status(401).json({ success: false, message: "Not register with us" })
      if (partner.acceptPartnerTls) return res.status(401).json({ success: false, message: "Account Already verified" })
      if (!partner.emailVerify || !partner?.mobileVerify) return res.status(400).json({ success: false, message: "Account not verified with mail or mobile" })
      const admin = await Admin.find({}).select("-password")
      const noOfPartners = await Partner.count()
      const updatePartner = await Partner.findByIdAndUpdate(decode?._id, {
        $set: {
          acceptPartnerTls: true, isActive: true,
          tlsUrl: admin[0]?.partnerTlsUrl,
          profile: {
            profilePhoto: "",
            consultantName: partner?.fullName,
            consultantCode: `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfPartners}`,
            associateWithUs: new Date(),
            primaryEmail: partner?.email,
            alternateEmail: "",
            primaryMobileNo: partner?.mobileNo,
            alternateMobileNo: "",
            whatsupNo: "",
            panNo: "",
            aadhaarNo: "",
            dob: null,
            gender: "",
            businessName: "",
            companyName: "",
            natureOfBusiness: "",
            designation: "",
            areaOfOperation: partner?.areaOfOperation,
            workAssociation: partner?.workAssociation,
            state: "",
            district: "",
            city: "",
            pinCode: "",
            about: "",
          },
          bankingDetails: {
            bankName: "",
            bankAccountNo: "",
            bankBranchName: "",
            gstNo: "",
            panNo: "",
            cancelledChequeImg: "",
            gstCopyImg: "",
          },
        }
      }, { new: true })
      return res.status(200).json({ success: true, message: "Thanks for being our partner" })
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid/expired acception" })
    }

  } catch (error) {
    console.log("partnerMobileNoVerify: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const partnerTls = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    return res.status(200).json({ success: true, message: "Successfully get partner tls", data: partner?.tlsUrl })
  } catch (error) {
    console.log("partnerTls error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

// //  for partner sign in
export const signIn = async (req, res) => {
  try {
    const { error } = validateSignIn(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const partner = await Partner.find({ email: req?.body?.email?.toLowerCase() });
    if (partner.length == 0) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner[0]?.isActive || !partner[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Account is not active" })
    const validPassword = await bcrypt.compare(req.body.password, partner[0].password,)
    if (!validPassword) return res.status(401).json({ success: false, message: "invaild email/password" })
    const updateLoginHistory = await Partner.findByIdAndUpdate(partner[0]?._id, { $set: { recentLogin: new Date(), lastLogin: partner[0]?.recentLogin ? partner[0]?.recentLogin : new Date() } })
    const token = partner[0]?.getAuth(true)

    return res.status(200).header("x-auth-token", token)
      .header("Access-Control-Expose-Headers", "x-auth-token").json({ success: true, message: "Successfully signIn" })
  } catch (error) {
    console.log("setPassword: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const signUpWithRequest = async (req, res) => {
  try {
    const { password, agreement, tokenId } = req.body
    if (!password) return res.status(400).json({ success: true, message: "Password is required" })
    if (!agreement) return res.status(400).json({ success: true, message: "Must accept our service agreement" })
    if (!tokenId) return res.status(400).json({ success: true, message: "Invalid/expired link" })
    console.log(process.env.EMPLOYEE_SECRET_KEY, process.env.EMPLOYEE_SECRET_KEY);
    try {
      await jwt.verify(tokenId, process.env.EMPLOYEE_SECRET_KEY)
      const decode = await jwtDecode(tokenId)
      console.log("decode", decode);
      const bcryptPassword = await bcrypt.hash(password, 10)
      const { fullName, email, mobileNo, workAssociation, areaOfOperation, empId,empBranchId } = decode
      if (!email || !mobileNo || !fullName || !workAssociation || !areaOfOperation || !empId ||!empBranchId) return res.status(400).json({ success: false, message: "Invalid/expired link" })
      const partner = await Partner.find({ email: email })
      if (partner[0]?.isActive || partner[[0]]?.mobileVerify || partner[0]?.emailVerify) return res.status(400).json({ success: false, message: "Account is already exist" })
      const noOfPartners = await Partner.count()
      const today = new Date()
      const modifiedPdfBytes = await editServiceAgreement("agreement/partner.pdf", today)
      await sendAccountTerm_ConditonsMail(email, "partner", modifiedPdfBytes);
      const newPartner = new Partner({
        fullName: fullName,
        email: email?.trim()?.toLowerCase(),
        mobileNo: mobileNo,
        workAssociation: workAssociation,
        areaOfOperation: areaOfOperation,
        password: bcryptPassword,
        acceptTnc: agreement,
        emailVerify: true,
        mobileVerify: true,
        isActive: true,
        tlsUrl: `${process?.env?.FRONTEND_URL}/agreement/partner.pdf`,
        profile: {
          profilePhoto: "",
          consultantName: fullName,
          consultantCode: `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfPartners+1}`,
          associateWithUs: today,
          primaryEmail: email,
          alternateEmail: "",
          primaryMobileNo: mobileNo,
          alternateMobileNo: "",
          whatsupNo: "",
          panNo: "",
          aadhaarNo: "",
          dob: null,
          gender: "",
          businessName: "",
          companyName: "",
          natureOfBusiness: "",
          designation: "",
          areaOfOperation: areaOfOperation,
          workAssociation: workAssociation,
          state: "",
          district: "",
          city: "",
          pinCode: "",
          about: "",
        },
        bankingDetails: {
          bankName: "",
          bankAccountNo: "",
          bankBranchName: "",
          gstNo: "",
          panNo: "",
          cancelledChequeImg: "",
          gstCopyImg: "",
          upiId: "",
        },
        salesId: empId,
        shareEmployee: [empId],
        branchId:empBranchId?.trim()
      })
      await newPartner.save()
      const token = newPartner?.getAuth(true)
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

//   //  for partner forget password
// export const forgetPassword =async (req,res)=>{
//   try {
//     if(!req.body.email) return res.status(404).json({success:false,message: "email is required"})
//     const partner = await Partner.find({email:req?.body?.email});
//     if(partner.length == 0) return res.status(404).json({success:false,message: "Not register with us"})
//     if(!partner[0]?.isActive) return res.status(400).json({success:false,message:"Account is not active"})
//     const otp = otp6Digit();
//     const setForgotPassword = await Partner.findByIdAndUpdate(partner[0]?._id,{$set:{forgotPasswordOTP: {otp:otp,createAt:Date.now()}}},{new:true})
//     try {
//       await sendOTPMail(req.body.email, otp,"partner");
//       res.status(200).json({ success: true, message: "Successfully send OTP", otp: otp});
//    } catch (err) {
//     console.log("send otp error",err);
//       return res.status(400).json({ success: false, message: "Failed to send OTP" });
//    }
//   } catch (error) {
//     console.log("setPassword: ",error);
//     return res.status(500).json({success: false,message:"Internal server error",error: error});
//   }
//   }

//  forget password verification check
// export const verifyForgetPassword = async (req,res,next)=>{
//   try {
//     if(!req.body.email) return res.status(400).json({success:false,message: "email is required"})
//     if(!req.body.otp) return res.status(400).json({success:false,message: "Otp is required"})
//      const partner = await Partner.find({email:req?.body?.email});
//      if(partner.length == 0) return res.status(404).json({success:false,message: "Not register with us"})
//      if(!partner[0]?.isActive) return res.status(400).json({success:false,message:"Account is not active"})
//      const validFiveMinutes =new Date().getTime() - 5 * 60 * 1000;

//      if( new Date(partner[0].forgotPasswordOTP?.createAt).getTime()>=validFiveMinutes && partner[0].forgotPasswordOTP?.otp==req?.body?.otp){
//        console.log(new Date(partner[0].forgotPasswordOTP?.createAt).getTime(),validFiveMinutes);
//        const updatePatner = await Partner.findByIdAndUpdate(partner[0]?._id,{$set:{"forgotPasswordOTP.verify":true}},{new:true})
//      const token = await partner[0].getAuth()
//       return res.status(201).header("x-auth-token", token)
//         .header("Access-Control-Expose-Headers", "x-auth-token").json({success: true, message: "Forget password otp verify"})
//      }else{
//        return res.status(400).json({success: false, message: "Invaild/expired OTP"})
//      }
//      // res.status(400).json({success: true, message: "valid otp"})
//   } catch (error) {
//    console.log("verifyEmailOtp: ",error);
//     return res.status(500).json({success: false,message:"Internal server error",error: error});
//   } 
//  }

//  set new forget password
// export const setForgetPassword =async (req,res)=>{
//   try {
//     const verify =  await authPartner(req,res)
//     if(!verify.success) return  res.status(401).json({success: false, message: verify.message})

//     const {error} = validateNewPassword(req.body);
//     if(error) return res.status(400).json({success:false,message:error.details[0].message})

//     if(req.body.password!=req.body.confirmPassword) return res.status(400).json({success:false,message:"Confirm password must be same"})

//     const partner = await Partner.find({email:req?.user?.email});
//     if(partner.length == 0) return res.status(404).json({success:false,message: "Not register with us"})

//     if(!partner[0]?.forgotPasswordOTP?.verify) return res.status(400).json({success:false,message:"forget password not active"})

//     const bcryptPassword = await bcrypt.hash(req.body.password,10)
//     const updatePatner = await Partner.findByIdAndUpdate(partner[0]?._id,{$set:{password:bcryptPassword}},{new:true})

//     const token = await updatePatner.getAuth(true)
//     return  res.status(200).header("x-auth-token", token)
//     .header("Access-Control-Expose-Headers", "x-auth-token").json({success: true, message: "Successfully set New password"})
//   } catch (error) {
//     console.log("setPassword: ",error);
//     return res.status(500).json({success: false,message:"Internal server error",error: error});
//   }
//   }


export const partnerForgetPassword = async (req, res) => {
  try {
    if (!req.body.email) return res.status(400).json({ success: false, message: "Account email required" })
    const partner = await Partner.find({ email: req.body.email })
    if (partner.length == 0) return res.status(404).json({ success: false, message: "Account not exist" })
    if (!partner[0]?.isActive || !partner[0]?.mobileVerify) return res.status(400).json({ success: false, message: "Account is not active" })

    const jwtToken = await jwt.sign({ _id: partner[0]?._id, email: partner[0]?.email }, process.env.PARTNER_SECRET_KEY, { expiresIn: '5m' })
    try {
      await sendForgetPasswordMail(req.body.email, `/partner/resetPassword/${jwtToken}`);
      console.log("send forget password partner");
      res.status(201).json({ success: true, message: "Successfully send mail" });
    } catch (err) {
      console.log("send forget password mail error", err);
      return res.status(400).json({ success: false, message: "Failed to send forget password mail" });
    }

  } catch (error) {
    console.log("get all partner case in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const partnerResetPassword = async (req, res) => {
  try {
    const { error } = validateResetPassword(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const { password, confirmPassword } = req.body
    if (password != confirmPassword) return res.status(400).json({ success: false, message: "Confirm password must be same" })
    const { verifyId } = req.query
    console.log("verifyId", verifyId);
    try {
      await jwt.verify(verifyId, process.env.PARTNER_SECRET_KEY)
      const decode = await jwtDecode(verifyId)
      const bcryptPassword = await bcrypt.hash(req.body.password, 10)
      const partner = await Partner.findById(decode?._id)
      if (!partner?.isActive || !partner?.mobileVerify) return res.status(400).json({ success: false, message: "Account is not active" })
      const forgetPasswordPartner = await Partner.findByIdAndUpdate(decode?._id, { $set: { password: bcryptPassword } })
      if (!forgetPasswordPartner) return res.status(404).json({ success: false, message: "Account not exist" })
      return res.status(200).json({ success: true, message: "Successfully reset password" })
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid/expired link" })
    }

  } catch (error) {
    console.log("get all client case in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


// //  get only profile information
export const getProfileDetails = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const partner = await Partner.findById(req?.user?._id, { isActive: 1, profile: 1 });
    if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    return res.status(200).json({ success: true, message: "Successfully get profile details", data: partner })
  } catch (error) {
    console.log("setPassword: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


// // update only profile information
export const updateProfileDetails = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const isExist = await Partner.findById(req?.user?._id);
    if (!isExist) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!isExist?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const { error } = validateProfileBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
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
    return res.status(200).json({ success: true, message: "Successfully update profile details" })
  } catch (error) {
    console.log("updatePatnerDetails: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

// //  get only banking information
export const getBankingDetails = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const partner = await Partner.findById(req?.user?._id, { isActive: 1, bankingDetails: 1 });
    if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    return res.status(200).json({ success: true, message: "Successfully get banking Details", data: partner })
  } catch (error) {
    console.log("setPassword: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}


// // update only banking details
export const updateBankingDetails = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const isExist = await Partner.findById(req?.user?._id);
    if (!isExist) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!isExist?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const { error } = validateBankingDetailsBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const updateKeys = ["bankName", "bankAccountNo", "bankBranchName", "gstNo", "panNo","cancelledChequeImg","gstCopyImg","ifscCode","upiId"]

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

// add new case
export const addNewCase = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const { error } = validateAddCase(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })


    req.body.partnerId = partner?._id
    req.body.partnerObjId = partner?._id
    req.body.partnerName = partner?.profile?.consultantName
    req.body.consultantCode = partner?.profile?.consultantCode
    req.body.partnerCode = partner?.profile?.consultantCode
    req.body.caseFrom = "partner"
    req.body.processSteps = []

    const newAddCase = new Case({...req.body,caseDocs:[],branchId:partner?.branchId})
    const noOfCase = await Case.count()
    newAddCase.fileNo = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfCase + 1}`
    await newAddCase.save()

    const defaultStatus = new CaseStatus({
      caseId: newAddCase?._id?.toString()
    })
    await defaultStatus.save()

    let bulkOps = [];
    (req?.body?.caseDocs || [])?.forEach((doc) => {
      bulkOps.push({
        insertOne: {
          document: {
            name: doc?.docName,
            type: doc?.docType,
            format: doc?.docFormat,
            url: doc?.docURL,
            partnerId: req?.user?._id,
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
      `Partner added new Case file No. ${newAddCase?.fileNo}`,
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

export const viewAllCase = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })
    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    const allPartnerCase = await Case.find({ partnerObjId: partner?._id })
    return res.status(201).json({ success: true, message: "Successfully get all case", data: allPartnerCase })
  } catch (error) {
    console.log("view all partner Case: ", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error });
  }
}

export const viewAllPartnerCase = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    // query = ?statusType=&search=&limit=&pageNo
    const pageItemLimit = req.query.limit ? req.query.limit : 10;
    const pageNo = req.query.pageNo ? (req.query.pageNo - 1) * pageItemLimit : 0;
    const searchQuery = req.query.search ? req.query.search : "";
    const statusType = req.query.status ? req.query.status : "";
    const startDate = req.query.startDate ? req.query.startDate : "";
    const endDate = req.query.endDate ? req.query.endDate : "";

    const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, req?.user?._id, false, false, true)
    if (!query.success) return res.status(400).json({ success: false, message: query.message })
    const aggregationPipeline = [
      { $match: query?.query }, // Match the documents based on the query
      {
         $group: {
            _id: null,
            totalAmtSum: { $sum: "$claimAmount" }, // Calculate the sum of totalAmt
            totalResolvedAmt: {
               $sum: { $cond: [{ $eq: ["$currentStatus", "Resolve"] }, "$claimAmount", 0] } // Calculate the sum of claimAmount for resolved cases
            }
         }
      }
   ];

    //  console.log("query",query?.query);
    const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 }).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails");
    const noOfCase = await Case.find(query?.query).count()
    const aggregateResult = await Case.aggregate(aggregationPipeline);
    return res.status(200).json({ success: true, message: "get case data", totalAmt: aggregateResult, data: getAllCase, noOfCase: noOfCase });

  } catch (error) {
    console.log("updateAdminCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

// old version
// export const partnerViewCaseById = async (req, res) => {
//   try {
//     const verify = await authPartner(req, res)
//     if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

//     const partner = await Partner.findById(req?.user?._id)
//     if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
//     if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })


//     const { _id } = req.query
//     if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

//     if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
//     const getCase = await Case.findById(_id).select("-caseDocs -processSteps -addEmployee -caseCommit -partnerReferenceCaseDetails")
//     if (!getCase) return res.status(404).json({ success: false, message: "Case not found" })

//     const [getCaseDoc, getCaseStatus, getCasePaymentDetails, getCaseGroDetails,getCaseOmbudsmanDetails] = await Promise.all([
//       CaseDoc.find({ 
//         $and: [
//           {
//             $or: [
//               { caseId: getCase?._id },
//               { caseMargeId: getCase?._id }
//             ]
//           },
//           {
//             $or: [
//               { isPrivate: false },
//               { isPrivate: { $exists: false } }
//             ]
//           }
//         ],  
//       isActive: true }).select("-adminId"),
//       CaseStatus.find({ $or: [{ caseId: getCase?._id }, { caseMargeId: getCase?._id }], isActive: true }).select("-adminId"),
//       CasePaymentDetails.find({ caseId: getCase?._id, isActive: true }),
//       CasegroStatus.findOne({ caseId: getCase?._id, isActive: true }).populate("paymentDetailsId"),
//       CaseOmbudsmanStatus.findOne({ caseId: getCase?._id, isActive: true }).populate("paymentDetailsId"),
//     ]);
    
//     // Convert `getCaseGroDetails` to a plain object if it exists
//       const caseGroDetailsObj = getCaseGroDetails ? getCaseGroDetails.toObject() : null;
//       const caseOmbudsmanDetailsObj = getCaseOmbudsmanDetails ? getCaseOmbudsmanDetails.toObject() : null;

//     const getCaseJson = getCase.toObject();
//     getCaseJson.caseDocs = getCaseDoc;
//     getCaseJson.processSteps = getCaseStatus;
//     getCaseJson.casePayment = getCasePaymentDetails;
//     if(caseGroDetailsObj){
//        getCaseJson.caseGroDetails = {
//          ...caseGroDetailsObj,
//          groStatusUpdates: caseGroDetailsObj?.groStatusUpdates?.filter(ele => ele?.isPrivate) || [],
//          queryHandling: caseGroDetailsObj?.queryHandling?.filter(ele => ele?.isPrivate) || [],
//          queryReply: caseGroDetailsObj?.queryReply?.filter(ele => ele?.isPrivate) || [],
//          approvalLetter: caseGroDetailsObj?.approvalLetterPrivate ? "" : caseGroDetailsObj?.approvalLetter,
//        };          
//     }else{
//       getCaseJson.caseGroDetails = caseGroDetailsObj
//     }

//     //  ombudsman status
//     if (caseOmbudsmanDetailsObj) {
//       getCaseJson.caseOmbudsmanDetails = {
//         ...caseOmbudsmanDetailsObj,
//         statusUpdates: caseOmbudsmanDetailsObj?.statusUpdates?.filter(ele => ele?.isPrivate) || [],
//         queryHandling: caseOmbudsmanDetailsObj?.queryHandling?.filter(ele => ele?.isPrivate) || [],
//         queryReply: caseOmbudsmanDetailsObj?.queryReply?.filter(ele => ele?.isPrivate) || [],
//         hearingSchedule: caseOmbudsmanDetailsObj?.hearingSchedule?.filter(ele => ele?.isPrivate) || [],
//         awardPart: caseOmbudsmanDetailsObj?.awardPart?.filter(ele => ele?.isPrivate) || [],
//         approvalLetter: caseOmbudsmanDetailsObj?.approvalLetterPrivate ? "" : caseOmbudsmanDetailsObj?.approvalLetter,
//       };
//     } else {
//       getCaseJson.caseOmbudsmanDetails = caseOmbudsmanDetailsObj
//     }
//     return res.status(200).json({ success: true, message: "get case data", data: getCaseJson });

//   } catch (error) {
//     console.log("updateAdminCase in error:", error);
//     res.status(500).json({ success: false, message: "Internal server error", error: error });

//   }
// }

// new version
export const partnerViewCaseById = async (req, res) => {
   try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })

      const { _id } = req.query;

      if (!validMongooseId(_id)) {
         return res.status(400).json({ success: false, message: "Not a valid id" });
      }

      const caseId = new Types.ObjectId(_id);

      const caseData = await Case.aggregate([
         { $match: { _id: caseId } },
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
                              { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] }
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
                              { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] }
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
                              { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] }
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

      if (result.caseGroDetails) {
         result.caseGroDetails = {
         ...result.caseGroDetails,
         groStatusUpdates: result.caseGroDetails?.groStatusUpdates?.filter(ele => ele?.isPrivate) || [],
         queryHandling: result.caseGroDetails?.queryHandling?.filter(ele => ele?.isPrivate) || [],
         queryReply: result.caseGroDetails?.queryReply?.filter(ele => ele?.isPrivate) || [],
         approvalLetter: result.caseGroDetails?.approvalLetterPrivate ? "" : result.caseGroDetails?.approvalLetter,
         };
      }

      if (result.caseOmbudsmanDetails) {
         result.caseOmbudsmanDetails = {
        ...result.caseOmbudsmanDetails,
        statusUpdates: result.caseOmbudsmanDetails?.statusUpdates?.filter(ele => ele?.isPrivate) || [],
        queryHandling: result.caseOmbudsmanDetails?.queryHandling?.filter(ele => ele?.isPrivate) || [],
        queryReply: result.caseOmbudsmanDetails?.queryReply?.filter(ele => ele?.isPrivate) || [],
        hearingSchedule: result.caseOmbudsmanDetails?.hearingSchedule?.filter(ele => ele?.isPrivate) || [],
        awardPart: result.caseOmbudsmanDetails?.awardPart?.filter(ele => ele?.isPrivate) || [],
        approvalLetter: result.caseOmbudsmanDetails?.approvalLetterPrivate ? "" : result.caseOmbudsmanDetails?.approvalLetter,
         };
      }

      return res.status(200).json({ success: true, message: "get case data", data: result });

   } catch (error) {
      console.error("employeeViewCaseByIdBy error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error });
   }
};


export const partnerUpdateCaseById = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })


    const { _id } = req.query
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const mycase = await Case.find({ _id: _id, partnerId: partner?._id })
    if (mycase.length == 0) return res.status(404).json({ success: false, message: "Case not found" })

    const { error } = validateAddCase(req.body);
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

    // console.log("case_id", _id, req.body);

    const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body,caseDocs:[] } }, { new: true })
    return res.status(200).json({ success: true, message: "Successfully update case", data: updateCase });

  } catch (error) {
    console.log("updatePartnerCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

export const partnerAddCaseFile = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    const { _id } = req.query
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

    const mycase = await Case.findByIdAndUpdate(_id, { $push: { caseDocs: req.body } }, { new: true })
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


export const getpartnerDashboard = async (req, res) => {
  try {
    // const year = Number(req.query.year || new Date().getFullYear());
    const verify = await authPartner(req, res);
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message });

    const partner = await Partner.findById(req?.user?._id).select("-password");
    if (!partner) return res.status(401).json({ success: false, message: "User account not found" });
    if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })

    const partnerNecessaryData = {
      lastLogin: partner?.lastLogin,
      recentLogin: partner?.recentLogin,
      fullName: partner?.fullName
    }

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
          partnerObjId: new Types.ObjectId(req?.user?._id),
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
          partnerObjId: new Types.ObjectId(req?.user?._id),
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


    return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData, partnerNecessaryData });

  } catch (error) {
    console.log("get dashbaord data error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
};

export const partnerDownloadReport = async (req, res) => {
  try {
    const verify = await authPartner(req, res);
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message });

    const partner = await Partner.findById(req?.user?._id).select("-password");
    if (!partner) return res.status(401).json({ success: false, message: "User account not found" });
    if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })

      // query = ?statusType=&search=&limit=&pageNo
      const searchQuery = req.query.search ? req.query.search : "";
      const statusType = req.query.status ? req.query.status : "";
      const startDate = req.query.startDate ? req.query.startDate : "";
      const endDate = req.query.endDate ? req.query.endDate : "";
      const type = req?.query?.type ? req.query.type : true

      const query = getAllCaseQuery(statusType, searchQuery, startDate, endDate, partner?._id, false, false, type)
      if (!query.success) return res.status(400).json({ success: false, message: query.message })
      const getAllCase = await Case.find(query?.query).sort({ createdAt: -1 });

      const excelBuffer = await partnerGetDownloadCaseExcel(getAllCase)
      res.setHeader('Content-Disposition', 'attachment; filename="cases.xlsx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200)
      res.send(excelBuffer)

  } catch (error) {
     console.log("updateAdminCase in error:", error);
     res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

export const getStatement = async (req, res) => {
  try {
     const verify = await authPartner(req, res)
     if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

     const partner = await Partner.findById(req?.user?._id).select({
      'bankingDetails.bankName':1,
      'bankingDetails.bankAccountNo':1,
      'bankingDetails.bankBranchName':1,
      'bankingDetails.panNo':1,
      'bankingDetails.branchId':1,
      'profile.consultantName':1,
      'profile.consultantCode':1,
      'profile.address':1,
      'branchId':1,
      'isActive':1,
   }).populate("salesId","fullName")
     if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
     
     if (!partner?.isActive) return res.status(401).json({ success: false, message: "Partner account not active" })



     const {startDate, endDate, limit, pageNo,isPdf } = req.query
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
     statementOf.partner = partner
     matchQuery.push({
        partnerId: partner?._id
     })
     const allStatement = await Statement.aggregate([
        {
           $match: {
              $and:[
                 ...matchQuery,
                 {isActive:true}

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
           $unwind:{
              path:'$partnerDetails',
              preserveNullAndEmptyArrays:true
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
           $unwind:{
              path:'$empDetails',
              preserveNullAndEmptyArrays:true
           }
        },
        { '$sort': { 'createdAt': -1 } },
        {
           $facet: {
            statement: [
              ...(isPdf=="true" ? [] : [
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

     return res.status(200).json({ success: true, message: `Successfully fetch all statement`, data: { data: data,totalData, statementOf } });

  } catch (error) {
     console.log("createOrUpdateStatement in error:", error);
     res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

  }
}