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
         fatherName:Joi.string().allow('').optional(),
         primaryEmail: Joi.string().email().required(),
         alternateEmail:Joi.string().email().allow('').optional(),
         primaryMobileNo: Joi.string().min(12).max(12).required(),
         whatsupNo:Joi.string().min(10).max(10).allow('').optional(),
         alternateMobileNo: Joi.string().min(10).max(10).allow('').optional(),
         panNo:Joi.string().min(10).max(10).allow('').optional(),
         aadhaarNo: Joi.string().min(12).max(12).allow('').optional(),
         dob: Joi.not().allow('').optional(),
         gender: Joi.string().allow('').optional(),
         address:Joi.string().allow('').optional(),
         state:Joi.string().allow('').optional(),
         district:Joi.string().allow('').optional(),
         city: Joi.string().allow('').optional(),
         pinCode:Joi.string().allow('').optional(),
         about: Joi.string().max(250).required().allow('').optional(),
    })
    return profileSchema.validate(body)
  }

  export const validateAddClientCase =(body)=>{
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