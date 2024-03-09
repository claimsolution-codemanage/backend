import Joi from "joi"

export const validateEmployeeSignUp =(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   email: Joi.string().email().required(),
   mobileNo: Joi.string().required(),
   type:Joi.string().required("Employee department required"),
   designation:Joi.string().required("Employee designation required"),
  })

  return bodySchema.validate(body)
}

export const validateEmployeeUpdate=(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   mobileNo: Joi.string().required(),
   type:Joi.string().required("Employee department required"),
   designation:Joi.string().required("Employee designation required"),
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
    sender:Joi.object().required(),
      receiver:Joi.object().required(),
      invoiceItems:Joi.array().required(),
      subAmt: Joi.number().required(),
      gstAmt:Joi.number().required(),
      totalAmt:Joi.number().required(),
      invoiceDate:Joi.string().required(),
   })
   return bodySchema.validate(body)
}
