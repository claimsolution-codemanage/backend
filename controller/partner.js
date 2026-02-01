import Partner from "../models/partner.js";
import {
  validateSignUp, validateBankingDetailsBody, validateProfileBody, validateSignIn,
  validateAddCase

} from "../utils/validatePatner.js";
import { otp6Digit, getAllCaseQuery,  partnerGetDownloadCaseExcel, getValidateDate, sendNotificationAndMail, dateOptions } from "../utils/helper.js";
import { sendMail } from '../utils/sendMail.js'
import { authPartner } from "../middleware/authentication.js";
import bcrypt from 'bcrypt'
import Case from "../models/case/case.js";
import { validMongooseId, validateResetPassword } from "../utils/helper.js";
import jwt from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import Admin from "../models/admin.js";
import { firebaseUpload } from "../utils/helper.js";
import CaseDoc from "../models/caseDoc.js";
import CaseStatus from "../models/caseStatus.js";
import Statement from "../models/statement.js";
import { Types } from "mongoose";
import { accountVerificationTemplate } from "../utils/emailTemplates/accountVerificationTemplate.js";
import { accountTermConditionTemplate } from "../utils/emailTemplates/accountTermConditionTemplate.js";
import { forgetPasswordTemplate } from "../utils/emailTemplates/forgotPasswordTemplate.js";
import { editServiceAgreement } from "../utils/createPdf/serviceAgreement.js";




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
export const signUp = async (req, res) => {
  try {
    const { error } = validateSignUp(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { fullName, email, mobileNo, workAssociation, areaOfOperation, partnerType, agreement, password } = req.body;
    if (!agreement) {
      return res.status(400).json({ success: false, message: "Must agree with our service agreement" });
    }

    const normalizedEmail = email?.trim()?.toLowerCase();
    const otp = otp6Digit();
    const hashedPassword = await bcrypt.hash(password, 10);

    let partner = await Partner.findOne({ email: normalizedEmail });

    // ✅ If partner exists and already verified
    if (partner?.emailVerify || partner?.mobileVerify) {
      return res.status(400).json({ success: false, message: "Email already registered with us" });
    }

    const partnerData = {
      fullName,
      email: normalizedEmail,
      mobileNo,
      workAssociation,
      areaOfOperation,
      partnerType,
      password: hashedPassword,
      emailOTP: { otp, createAt: Date.now() },
      acceptTnc: agreement,
    };

    let partnerDoc;
    if (!partner) {
      // Create new partner
      partnerDoc = new Partner(partnerData);
      await partnerDoc.save();
    } else {
      // Update existing partner
      partnerDoc = await Partner.findByIdAndUpdate(partner._id, { $set: partnerData }, { new: true });
    }

    // ✅ Generate auth token
    const token = await partnerDoc.getAuth();

    // ✅ Send OTP
    try {
      await sendMail({
        subject: "Claim Solution Partner Account Verification",
        to: normalizedEmail,
        html: accountVerificationTemplate({ name: fullName, otp, type: "Partner" }),
      });
      return res
        .status(201)
        .header("x-auth-token", token)
        .header("Access-Control-Expose-Headers", "x-auth-token")
        .json({ success: true, message: "Successfully sent OTP" });
    } catch (mailErr) {
      console.error("send OTP error:", mailErr);
      return res.status(400).json({ success: false, message: "Failed to send OTP" });
    }
  } catch (error) {
    console.error("signup error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};


//  at time of signup
export const partnerResendOtp = async (req, res) => {
  try {
    const verify = await authPartner(req, res);
    if (!verify.success) {
      return res.status(401).json({ success: false, message: verify.message });
    }

    const partner = await Partner.findById(req.user._id);
    if (!partner) {
      return res.status(401).json({ success: false, message: "Not signed up with us" });
    }

    if (partner.mobileVerify || partner.isActive || partner.emailVerify) {
      return res.status(400).json({ success: false, message: "Account is already registered" });
    }

    const otp = otp6Digit();
    const updatedPartner = await Partner.findByIdAndUpdate(
      partner._id,
      { $set: { emailOTP: { otp, createAt: Date.now() } } },
      { new: true }
    );

    if (!updatedPartner) {
      return res.status(401).json({ success: false, message: "Not signed up with us" });
    }

    try {
      await sendMail({
        subject: "Account Verification - Resend OTP",
        to: partner.email,
        html: accountVerificationTemplate({ name: partner.fullName, otp, type: "Partner" }),
      });
      return res.status(200).json({ success: true, message: "OTP resent successfully" });
    } catch (err) {
      console.error("Error sending OTP:", err);
      return res.status(400).json({ success: false, message: "Failed to resend OTP" });
    }
  } catch (error) {
    console.error("partnerResendOtp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};


//  for email verification check
export const verifyEmailOtp = async (req, res) => {
  try {
    const verify = await authPartner(req, res);
    if (!verify.success) {
      return res.status(401).json({ success: false, message: verify.message });
    }

    const partner = await Partner.findById(req.user?._id);
    if (!partner) {
      return res.status(401).json({ success: false, message: "Not registered with us" });
    }

    if (partner.mobileVerify || partner.emailVerify) {
      return res.status(400).json({ success: false, message: "Account is already verified" });
    }

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    const otpValidFrom = Date.now() - 5 * 60 * 1000; // 5 minutes
    const otpCreatedAt = new Date(partner.emailOTP?.createAt).getTime();
    const isOtpValid = otpCreatedAt >= otpValidFrom && partner.emailOTP?.otp === otp;

    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    try {
      const date = new Date()
      const today = date?.toLocaleString('en-US', dateOptions)?.split("GMT")?.[0]
      const replacements= { service_commission: `4%`, signed_on: today }
      const modifiedPdfBytes = await editServiceAgreement("agreement/partner.pdf", replacements);

      await sendMail({
        subject: "Partner Service Agreement",
        to: partner.email,
        cc:[process.env.CC_MAIL_ID],
        html: accountTermConditionTemplate({ as: "Partner", name: partner?.fullName }),
        attachments: [{
          filename: 'service_agreement.pdf',
          content: modifiedPdfBytes,
          encoding: 'base64'
        }]
      });

      const noOfPartners = await Partner.countDocuments();
      const consultantCode = `${date?.getFullYear()}${date?.getMonth() + 1 < 10 ? `0${date?.getMonth() + 1}` : date?.getMonth() + 1
        }${date?.getDate()}${noOfPartners + 1}`;

      const profileData = {
        profilePhoto: "",
        consultantName: partner.fullName,
        consultantCode,
        associateWithUs: date,
        primaryEmail: partner.email,
        alternateEmail: "",
        primaryMobileNo: partner.mobileNo,
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
        areaOfOperation: partner.areaOfOperation,
        workAssociation: partner.workAssociation,
        state: "",
        district: "",
        city: "",
        pinCode: "",
        about: "",
        kycPhoto: "",
        kycAadhaar: "",
        kycAadhaarBack: "",
        kycPan: "",
      };

      const bankingData = {
        bankName: "",
        bankAccountNo: "",
        bankBranchName: "",
        gstNo: "",
        panNo: "",
        cancelledChequeImg: "",
        gstCopyImg: "",
      };

      const updatedPartner = await Partner.findByIdAndUpdate(
        partner._id,
        {
          $set: {
            emailVerify: true,
            mobileVerify: true,
            isActive: true,
            tlsUrl: `${process.env.FRONTEND_URL}/agreement/partner.pdf`,
            profile: profileData,
            bankingDetails: bankingData,
          },
        },
        { new: true }
      );

      const token = await updatedPartner.getAuth(true);
      return res
        .status(200)
        .header("x-auth-token", token)
        .header("Access-Control-Expose-Headers", "x-auth-token")
        .json({ success: true, message: "Successfully signed up" });
    } catch (err) {
      console.error("OTP verification error:", err);
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }
  } catch (error) {
    console.error("verifyEmailOtp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};



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
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, password } = req.body;
    const partner = await Partner.findOne({ email: email?.trim().toLowerCase() });

    if (!partner) {
      return res.status(404).json({ success: false, message: "Not registered with us" });
    }

    if (!partner.isActive || !partner.mobileVerify) {
      return res.status(400).json({ success: false, message: "Account is not active" });
    }

    const isPasswordValid = await bcrypt.compare(password, partner.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email/password" });
    }

    // Update login history
    await Partner.findByIdAndUpdate(partner._id, {
      $set: {
        lastLogin: partner.recentLogin || new Date(),
        recentLogin: new Date(),
      },
    });

    const token = await partner.getAuth(true);

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

export const signUpWithRequest = async (req, res) => {
  try {
    const { password, agreement, tokenId } = req.body;

    if (!password) return res.status(400).json({ success: false, message: "Password is required" });
    if (!agreement) return res.status(400).json({ success: false, message: "Must accept the service agreement" });
    if (!tokenId) return res.status(400).json({ success: false, message: "Invalid or expired link" });

    let decoded;
    try {
      await jwt.verify(tokenId, process.env.EMPLOYEE_SECRET_KEY);
      decoded = jwtDecode(tokenId);
    } catch (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({ success: false, message: "Invalid or expired link" });
    }

    const { fullName, email, mobileNo, workAssociation, areaOfOperation, empId, empBranchId } = decoded;

    if (!email || !mobileNo || !fullName || !workAssociation || !areaOfOperation || !empId || !empBranchId) {
      return res.status(400).json({ success: false, message: "Invalid or expired link" });
    }

    const existingPartner = await Partner.findOne({ email: email.trim().toLowerCase() });
    if (existingPartner?.isActive || existingPartner?.mobileVerify || existingPartner?.emailVerify) {
      return res.status(400).json({ success: false, message: "Account already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const noOfPartners = await Partner.countDocuments();
    const date = new Date()
    const today = date?.toLocaleString('en-US', dateOptions)?.split("GMT")?.[0]
    const replacements= { service_commission: `4%`, signed_on: today }
    const modifiedPdfBytes = await editServiceAgreement("agreement/partner.pdf", replacements);

    await sendMail({
      subject: "Partner Service Agreement",
      to: email,
      cc:[process.env.CC_MAIL_ID],
      html: accountTermConditionTemplate({ as: "Partner", name: existingPartner?.fullName }),
      attachments: [{
        filename: 'service_agreement.pdf',
        content: modifiedPdfBytes,
        encoding: 'base64'
      }]
    });

    const newPartner = new Partner({
      fullName,
      email: email.trim().toLowerCase(),
      mobileNo,
      workAssociation,
      areaOfOperation,
      password: hashedPassword,
      acceptTnc: agreement,
      emailVerify: true,
      mobileVerify: true,
      isActive: true,
      tlsUrl: `${process.env.FRONTEND_URL}/agreement/partner.pdf`,
      profile: {
        profilePhoto: "",
        consultantName: fullName,
        consultantCode: `${date?.getFullYear()}${String(date?.getMonth() + 1).padStart(2, "0")}${String(date?.getDate()).padStart(2, "0")}${noOfPartners + 1}`,
        associateWithUs: date,
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
        areaOfOperation,
        workAssociation,
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
      branchId: empBranchId.trim(),
    });

    await newPartner.save();
    const token = newPartner.getAuth(true);

    return res
      .status(200)
      .header("x-auth-token", token)
      .header("Access-Control-Expose-Headers", "x-auth-token")
      .json({ success: true, message: "Successfully signed up" });

  } catch (error) {
    console.error("signUpWithRequest error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong", error });
  }
};

export const partnerForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Account email is required" });
    }

    const partner = await Partner.findOne({ email: email.trim().toLowerCase() });
    if (!partner) {
      return res.status(404).json({ success: false, message: "Account does not exist" });
    }

    if (!partner.isActive || !partner.mobileVerify) {
      return res.status(400).json({ success: false, message: "Account is not active" });
    }

    // ✅ Generate JWT token valid for 5 minutes
    const jwtToken = jwt.sign(
      { _id: partner._id, email: partner.email },
      process.env.PARTNER_SECRET_KEY,
      { expiresIn: "5m" }
    );

    try {
      await sendMail({
        subject: "Password Reset",
        to: partner.email,
        html: forgetPasswordTemplate({
          email: partner.email,
          name: partner.fullName,
          link: `/partner/resetPassword/${jwtToken}`,
        }),
      });
      console.log("Forget password email sent to partner:", partner.email);
      return res.status(201).json({ success: true, message: "Password reset email sent successfully" });
    } catch (mailErr) {
      console.error("Error sending forget password mail:", mailErr);
      return res.status(400).json({ success: false, message: "Failed to send password reset email" });
    }
  } catch (error) {
    console.error("partnerForgetPassword error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};

export const partnerResetPassword = async (req, res) => {
  try {
    const { error } = validateResetPassword(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Confirm password must match" });
    }

    const { verifyId } = req.query;
    if (!verifyId) {
      return res.status(400).json({ success: false, message: "Reset link is required" });
    }

    let decoded;
    try {
      await jwt.verify(verifyId, process.env.PARTNER_SECRET_KEY);
      decoded = jwtDecode(verifyId);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired link" });
    }

    const partner = await Partner.findById(decoded._id);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Account does not exist" });
    }

    if (!partner.isActive || !partner.mobileVerify) {
      return res.status(400).json({ success: false, message: "Account is not active" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Partner.findByIdAndUpdate(partner._id, { $set: { password: hashedPassword } });

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("partnerResetPassword error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
};



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
    const updateKeys = ["bankName", "bankAccountNo", "bankBranchName", "gstNo", "panNo", "cancelledChequeImg", "gstCopyImg", "ifscCode", "upiId"]

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

    const newAddCase = new Case({ ...req.body, caseDocs: [], branchId: partner?.branchId })
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
                    { $or: [{ $eq: ["$caseId", "$$id"] }, { $eq: ["$caseMargeId", "$$id"] }] },
                     { $ne: ["$isPrivate", true] },
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

    const updateCase = await Case.findByIdAndUpdate(_id, { $set: { ...req.body, caseDocs: [] } }, { new: true })
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
            partnerId: req?.user?._id
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
      'bankingDetails.bankName': 1,
      'bankingDetails.bankAccountNo': 1,
      'bankingDetails.bankBranchName': 1,
      'bankingDetails.panNo': 1,
      'bankingDetails.branchId': 1,
      'profile.consultantName': 1,
      'profile.consultantCode': 1,
      'profile.address': 1,
      'branchId': 1,
      'isActive': 1,
    }).populate("salesId", "fullName")
    if (!partner) return res.status(401).json({ success: false, message: "Partner account not found" })

    if (!partner?.isActive) return res.status(401).json({ success: false, message: "Partner account not active" })



    const { startDate, endDate, limit, pageNo, isPdf } = req.query
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
          $and: [
            ...matchQuery,
            { isActive: true }

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
        $unwind: {
          path: '$partnerDetails',
          preserveNullAndEmptyArrays: true
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
        $unwind: {
          path: '$empDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      { '$sort': { 'createdAt': -1 } },
      {
        $facet: {
          statement: [
            ...(isPdf == "true" ? [] : [
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

    return res.status(200).json({ success: true, message: `Successfully fetch all statement`, data: { data: data, totalData, statementOf } });

  } catch (error) {
    console.log("createOrUpdateStatement in error:", error);
    res.status(500).json({ success: false, message: "Oops! something went wrong", error: error });

  }
}