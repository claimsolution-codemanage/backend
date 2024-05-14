import Joi from "joi"

export const validateEmployeeSignUp =(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   email: Joi.string().email().required(),
   mobileNo: Joi.string().required(),
   type:Joi.string().required("Employee department required"),
   designation:Joi.string().required("Employee designation required"),
   branchId:Joi.string().required("Employee branch is required"),
   empId:Joi.string().required("Employee Id is required"),
  })

  return bodySchema.validate(body)
}

export const validateSathiTeamSignUp =(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   email: Joi.string().email().required(),
   mobileNo: Joi.string().required(),
  })

  return bodySchema.validate(body)
}

export const validateEmployeeUpdate=(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   mobileNo: Joi.string().required(),
   branchId:Joi.string().required("Employee branch is required"),
   type:Joi.string().required("Employee department is required"),
   designation:Joi.string().required("Employee designation is required"),
  })

  return bodySchema.validate(body)
}

export const validateEmployeeSignIn =(body)=>{
  const bodySchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
   
   })
 
   return bodySchema.validate(body)
}

export const validateEmployeeResetPassword =(body)=>{
  const bodySchema = Joi.object({
    password: Joi.string().required(),
    confirmPassword: Joi.string().required(),
   })
   return bodySchema.validate(body)
}

export const validateUpdateEmployeeCase =(body)=>{
  const bodySchema = Joi.object({
    _id: Joi.string().required(),
    status: Joi.string().required(),
    remark: Joi.string().required(),
   })
 
   return bodySchema.validate(body)
}

export const validateInvoice =(body)=>{
  const bodySchema = Joi.object({
    invoiceNo:Joi.string().allow('').optional(),
    sender:Joi.object().required(),
      receiver:Joi.object().required(),
      invoiceItems:Joi.array().required(),
      subAmt: Joi.number().required(),
      gstAmt:Joi.number().required(),
      totalAmt:Joi.number().required(),
      // invoiceDate:Joi.string().required(),
      billDate:Joi.number().required()
   })
   return bodySchema.validate(body)
}


export const validateAddPartner =(body)=>{
  const bodySchema = Joi.object({
    fullName: Joi.string().required(),
    email: Joi.string().email().required(),
    mobileNo:Joi.string().required(),
    workAssociation:Joi.string().required(),
    areaOfOperation:Joi.string().required(),
   })
   return bodySchema.validate(body)
}


export const validateAddEmpCase =(body)=>{
  const caseSchema = Joi.object({
      clientEmail:Joi.string().email().allow('').optional(),
      clientMobileNo:Joi.string().min(10).max(10).allow('').optional(),
      clientName:Joi.string().allow('').optional(),
      partnerEmail:Joi.string().email().allow('').optional(),
      partnerCode:Joi.string().allow('').optional(),
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