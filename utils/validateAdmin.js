import Joi from "joi"

export const validateAdminSignUp =(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   email: Joi.string().email().required(),
   mobileNo: Joi.string().min(10).max(10).required(),
  //  key:Joi.string().required()
  })

  return bodySchema.validate(body)
}

export const validateAdminSignIn =(body)=>{
  const bodySchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
   
   })
 
   return bodySchema.validate(body)
}

export const validateAdminResetPassword =(body)=>{
  const bodySchema = Joi.object({
    password: Joi.string().required(),
    confirmPassword: Joi.string().required(),
   })
 
   return bodySchema.validate(body)
}

export const validateUpdateAdminCase =(body)=>{
  const bodySchema = Joi.object({
    _id: Joi.string().required(),
    status: Joi.string().required(),
    remark: Joi.string().required(),
   })
 
   return bodySchema.validate(body)
}

export const validateEditAdminCaseStatus =(body)=>{
  const bodySchema = Joi.object({
    caseId: Joi.string().required(),
    status: Joi.string().required(),
    remark: Joi.string().required(),
    processId:Joi.string().required(),
    isCurrentStatus:Joi.bool().required(),
   })
 
   return bodySchema.validate(body)
}

export const validateAdminSettingDetails =(body)=>{
  const bodySchema = Joi.object({
    fullName:Joi.string().required(),
    email:Joi.string().email().required(),
    mobileNo:Joi.string().min(10).max(10).required(),
    consultantFee: Joi.number().required(),
   })
 
   return bodySchema.validate(body)
}

export const validateAdminAddCaseFee =(body)=>{
  const bodySchema = Joi.object({
    typeFees: Joi.string().required(),
    caseFees: Joi.string().required(),

   })
 
   return bodySchema.validate(body)
}

export const validateAdminUpdateCasePayment =(body)=>{
  const bodySchema = Joi.object({
    _id: Joi.string().required(),
    paymentId: Joi.string().required(),
    paymentMode: Joi.string().required(),

   })
 
   return bodySchema.validate(body)
}

export const validateAdminAddEmployeeToCase =(body)=>{
  const bodySchema = Joi.object({
    shareEmployee: Joi.array().items(Joi.any()).min(1).required(),
    shareCase: Joi.array().items(Joi.any()).min(1).required(),
   })
 
   return bodySchema.validate(body)
}

export const validateAdminAddJob =(body)=>{
  const bodySchema = Joi.object({
    title:Joi.string().required(),
    experience:Joi.string().required(),
    qualification:Joi.string().required(),
    about:Joi.string().required(),
    requirements:Joi.string().required()
   })
 
   return bodySchema.validate(body)
}
