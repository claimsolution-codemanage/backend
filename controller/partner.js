import Partner from "../models/partner.js";
import {
  validateSignUp, validateUpdateBody, validateBankingDetailsBody, validateProfileBody, validateNewPassword, validateSignIn,
  validateAddCase

} from "../utils/validatePatner.js";
import { otp6Digit, getAllCaseQuery } from "../utils/helper.js";
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


//  for create new account
export const signUp = async function (req, res) {
  try {
    const { error } = validateSignUp(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })

    const otp = otp6Digit();
    const partner = await Partner.find({ email: req.body.email });
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
        email: req.body.email,
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
            email: req.body.email,
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
        const modifiedPdfBytes = editServiceAgreement("agreement/partner.pdf", today)
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
              consultantCode: `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfPartners}`,
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
    const partner = await Partner.find({ email: req?.body?.email });
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
      const { fullName, email, mobileNo, workAssociation, areaOfOperation, empId } = decode
      if (!email || !mobileNo || !fullName || !workAssociation || !areaOfOperation || !empId) return res.status(400).json({ success: false, message: "Invalid/expired link" })
      const partner = await Partner.find({ email: email })
      if (partner[0]?.isActive || partner[[0]]?.mobileVerify || partner[0]?.emailVerify) return res.status(400).json({ success: false, message: "Account is already exist" })
      const noOfPartners = await Partner.count()
      const today = new Date()
      const modifiedPdfBytes = await editServiceAgreement("agreement/partner.pdf", today)
      await sendAccountTerm_ConditonsMail(email, "partner", modifiedPdfBytes);
      const newPartner = new Partner({
        fullName: fullName,
        email: email,
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
          consultantCode: `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfPartners}`,
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
        shareEmployee: [empId]
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
    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const { error } = validateProfileBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const updatePatnerDetails = await Partner.findByIdAndUpdate(req?.user?._id, {
      $set: {
        "profile.profilePhoto": req.body.profilePhoto,
        "profile.consultantName": req.body.consultantName,
        "profile.alternateEmail": req.body.alternateEmail,
        // "profile.primaryMobileNo":req.body.primaryMobileNo,
        "profile.alternateMobileNo": req.body.alternateMobileNo,
        "profile.whatsupNo": req.body.whatsupNo,
        "profile.panNo": req.body.panNo,
        "profile.aadhaarNo": req.body.aadhaarNo,
        "profile.dob": req.body.dob,
        "profile.businessName": req.body.businessName,
        "profile.companyName": req.body.companyName,
        "profile.natureOfBusiness": req.body.natureOfBusiness,
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
    const partner = await Partner.findById(req?.user?._id);
    if (!partner) return res.status(404).json({ success: false, message: "Not register with us" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const { error } = validateBankingDetailsBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })
    const updatePatnerDetails = await Partner.findByIdAndUpdate(req?.user?._id, {
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
    req.body.partnerName = partner?.profile?.consultantName
    req.body.consultantCode = partner?.profile?.consultantCode
    req.body.caseFrom = "partner"
    req.body.processSteps = [{
      date: Date.now(),
      remark: "pending stage.",
      consultant: "",
    }]
    req.body.caseDocs = req?.body?.caseDocs?.map(caseFile => {
      return {
        docDate: new Date(),
        docName: caseFile?.docName,
        docType: caseFile?.docFormat,
        docFormat: caseFile?.docFormat,
        docURL: caseFile?.docURL,
      }
    })

    const newAddCase = new Case(req.body)
    const noOfCase = await Case.count()
    newAddCase.fileNo = `${new Date().getFullYear()}${new Date().getMonth() + 1 < 10 ? `0${new Date().getMonth() + 1}` : new Date().getMonth() + 1}${new Date().getDate()}${noOfCase + 1}`
    await newAddCase.save()
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

    const allPartnerCase = await Case.find({ partnerId: partner?._id })
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

    //  console.log("query",query?.query);
    const getAllCase = await Case.find(query?.query).skip(pageNo).limit(pageItemLimit).sort({ createdAt: -1 });
    const noOfCase = await Case.find(query?.query).count()
    return res.status(200).json({ success: true, message: "get case data", data: getAllCase, noOfCase: noOfCase });

  } catch (error) {
    console.log("updateAdminCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

export const partnerViewCaseById = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })


    const { _id } = req.query
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })
    const mycase = await Case.findById(_id)
    if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })

    return res.status(200).json({ success: true, message: "get case data", data: mycase });

  } catch (error) {
    console.log("updateAdminCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}

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

export const partnerAddCaseFile = async (req, res) => {
  try {
    const verify = await authPartner(req, res)
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message })

    const partner = await Partner.findById(req?.user?._id)
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })
    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Account is not active" })

    const { _id } = req.query
    if (!validMongooseId(_id)) return res.status(400).json({ success: false, message: "Not a valid id" })

    console.log("add case file", req.body);
    if (!req.body?.docURL) return res.status(400).json({ success: false, message: "Please upload file first" })
    const { error } = validateAddCaseFile(req.body);
    req.body.docDate = new Date()
    req.body.docName = req?.body?.docName,
      req.body.docType = req?.body?.docType,
      req.body.docFormat = req?.body?.docType
    if (error) return res.status(400).json({ success: false, message: error.details[0].message })


    const mycase = await Case.findByIdAndUpdate(_id, { $push: { caseDocs: req.body } }, { new: true })
    if (!mycase) return res.status(404).json({ success: false, message: "Case not found" })

    return res.status(200).json({ success: true, message: "Successfully add case file" })


  } catch (error) {
    console.log("updateAdminCase in error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
}


export const getpartnerDashboard = async (req, res) => {
  try {
    const verify = await authPartner(req, res);
    if (!verify.success) return res.status(401).json({ success: false, message: verify.message });

    const partner = await Partner.findById(req?.user?._id).select("-password");
    if (!partner) return res.status(401).json({ success: false, message: "User account not found" });
    if (!partner?.isActive) return res.status(400).json({ success: false, message: "Account is not active" })


    const partnerNecessaryData = {
      lastLogin: partner?.lastLogin,
      recentLogin: partner?.recentLogin,

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
          'isActive': true,
          'isPartnerReferenceCase': false,
          'isEmpSaleReferenceCase': false,
          'partnerId': req?.user?._id // Assuming 'partnerId' is the field to match
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
          'partnerId': req?.user?._id,
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

    return res.status(200).json({ success: true, message: "get dashboard data", graphData: mergedGraphData, pieChartData, partnerNecessaryData });

  } catch (error) {
    console.log("get dashbaord data error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error });

  }
};

