import Joi from "joi"

// validate signup body
export const validateClientSignUp =(body)=>{
  const bodySchema = Joi.object({
   fullName: Joi.string().required(),
   email: Joi.string().email().required(),
   mobileNo: Joi.string().required(),
   password: Joi.string().min(8).required(),
   agreement:Joi.boolean().required()
  })

  return bodySchema.validate(body)
}

export const validateClientSignIn =(body)=>{
    const bodySchema = Joi.object({
    email:Joi.string().email().required(),
    password:Joi.string().required(),
    })
    return bodySchema.validate(body)
  }

export const validateClientProfileBody =(body)=>{
    const profileSchema =Joi.object({
        profilePhoto: Joi.string().allow('').optional(),
         consultantName: Joi.string().allow('').required(),
         consultantCode: Joi.string().required(),
         associateWithUs:Joi.date().allow('').required(),
         fatherName:Joi.string().required(),
         primaryEmail: Joi.string().email().required(),
         alternateEmail:Joi.string().email().allow('').optional(),
         primaryMobileNo: Joi.string().min(12).max(12).optional(),
         whatsupNo:Joi.string().min(10).max(10).allow('').optional(),
         alternateMobileNo: Joi.string().min(10).max(10).allow('').optional(),
         panNo:Joi.string().min(10).max(10).required(),
         aadhaarNo: Joi.string().min(12).max(12).required(),
         dob: Joi.date().required(),
         gender: Joi.string().required(),
         address:Joi.string().required(),
         state:Joi.string().required(),
         district:Joi.string().required(),
         city: Joi.string().required(),
         pinCode:Joi.string().required(),
         about: Joi.string().max(250).required().allow('').optional(),
    })
    return profileSchema.validate(body)
  }

  export const validateAddClientCase =(body)=>{
    const caseSchema = Joi.object({
        policyType:Joi.string().required(),
        insuranceCompanyName:Joi.string().required(),
        complaintType:Joi.string().required(),
        policyNo:Joi.string().required(),
        claimAmount:Joi.number().min(10).required(),
        problemStatement:Joi.string().required(),
    })
    return caseSchema.validate(body)
  }