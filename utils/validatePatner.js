import Joi from "joi"

// validate signup body
export const validateSignUp =(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   email: Joi.string().email().required(),
   mobileNo: Joi.string().required(),
   workAssociation: Joi.string().required(),
   areaOfOperation: Joi.string().required(),
   password :Joi.string().min(8).required(),
   agreement:Joi.boolean().required()
  })

  return bodySchema.validate(body)
}

// validate new password
export const validateNewPassword =(body)=>{
  const bodySchema = Joi.object({
  password:Joi.string().min(8).required(),
  confirmPassword:Joi.string().required()
  })
  return bodySchema.validate(body)
}

// validate signin body
export const validateSignIn =(body)=>{
  const bodySchema = Joi.object({
  email:Joi.string().email().required(),
  password:Joi.string().required(),
  })
  return bodySchema.validate(body)
}


// not use
export const validateUpdateBody =(body)=>{
  const bodySchema = Joi.object({
    profile: Joi.object({
      consultantName: Joi.string().required(),
      consultantCode:Joi.string().allow('').optional(),
      profilePhoto:Joi.string().allow('').optional(),
      primaryEmail: Joi.string().email().allow('').optional(),
      alternateEmail: Joi.string().email().allow('').optional(),
      primaryMobileNo: Joi.string().min(10).max(10).required(),
      alternateMobileNo:Joi.string().min(10).max(10).allow('').optional(),
      whatsupNo:Joi.string().min(10).max(10).allow('').optional(),
      panNo:Joi.string().required() ,
      aadhaarNo: Joi.string().min(12).max(12).required(),
      dob: Joi.string().required(),
      businessName: Joi.string().required().allow('').optional(),
      companyName: Joi.string().required().allow('').optional(),
      natureOfBusiness: Joi.string().required(),
      designation: Joi.string().required(),
      areaOfOperation: Joi.string().required(),
      workAssociation: Joi.string().required(),
      gender: Joi.string().required(),
      state:Joi.string().required(),
      district: Joi.string().required(),
      city: Joi.string().required(),
      pinCode: Joi.string().required(),
      about: Joi.string().allow('').optional(),
    }),
    bankingDetails: Joi.object({
      bankName: Joi.string().required(),
      bankAccountNo: Joi.string().required(),
      bankBranchName: Joi.string().required(),
      gstNo: Joi.string().required(),
      panNo:Joi.string().required(),
      cancelledChequeImg: Joi.string().required(),
      gstCopyImg:Joi.string().required(),
    })
  })

  return bodySchema.validate(body)
} 

export const validateProfileBody =(body)=>{
  const profileSchema =Joi.object({
      consultantName: Joi.string().required(),
      consultantCode:Joi.string().allow('').optional(),
      profilePhoto:Joi.string().allow('').optional(),
      primaryEmail: Joi.string().email().allow('').optional(),
      alternateEmail: Joi.string().email().allow('').optional(),
      primaryMobileNo: Joi.string().min(12).max(12).required(),
      alternateMobileNo:Joi.string().min(10).max(10).allow('').optional(),
      whatsupNo:Joi.string().min(10).max(10).allow('').optional(),
      panNo:Joi.string().min(10).max(10).allow('').optional(),
      aadhaarNo: Joi.string().min(12).max(12).allow('').optional(),
      dob: Joi.not().allow('').optional(),
      businessName: Joi.string().allow('').optional(),
      companyName: Joi.string().allow('').optional(),
      natureOfBusiness: Joi.string().allow('').optional(),
      designation: Joi.string().allow('').optional(),
      areaOfOperation: Joi.string().allow('').optional(),
      associateWithUs:Joi.string().allow('').optional(),
      workAssociation: Joi.string().allow('').optional(),
      gender: Joi.string().allow('').optional(),
      state:Joi.string().allow('').optional(),
      district: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      address: Joi.string().allow('').optional(),
      pinCode: Joi.string().allow('').optional(),
      about: Joi.string().allow('').max(200).optional(),
      kycPhoto:Joi.string().allow('').optional(),
      kycAadhaar:Joi.string().allow('').optional(),
      kycAadhaarBack:Joi.string().allow('').optional(),
      kycPan:Joi.string().allow('').optional(),
  })
  return profileSchema.validate(body)
}

export const validateBankingDetailsBody =(body)=>{
  const bankingDetailsSchema =Joi.object({
    bankName: Joi.string().required(),
    bankAccountNo: Joi.string().required(),
    bankBranchName: Joi.string().required(),
    gstNo: Joi.string().min(15).max(15).allow('').optional(),
    panNo:Joi.string().min(10).max(10).required(),
    ifscCode:Joi.string().required(),
    upiId:Joi.string().allow('').optional(),
    cancelledChequeImg: Joi.string().allow('').optional(),
    gstCopyImg:Joi.string().allow('').optional(),

  })
  return bankingDetailsSchema.validate(body)
}

export const validateAddCase =(body)=>{
  const caseSchema = Joi.object({
      name:Joi.string().required(),
      fatherName:Joi.string().allow('').optional(),
      email:Joi.string().email().allow('').optional(),
      mobileNo:Joi.string().min(10).max(10).required(),
      policyType:Joi.string().allow('').optional(),
      insuranceCompanyName:Joi.string().allow('').optional(),
      complaintType:Joi.string().allow('').optional(),
      policyNo:Joi.string().allow('').optional(),
      address:Joi.string().allow('').optional(),
      DOB:Joi.not().allow('').optional(),
      pinCode:Joi.string().allow('').optional(),
      claimAmount:Joi.number().min(10).required(),
      city:Joi.string().allow('').optional(),
      state:Joi.string().allow('').optional(),
      problemStatement:Joi.string().allow('').optional(),
      caseDocs:Joi.array().optional(),
  })
  return caseSchema.validate(body)
}

