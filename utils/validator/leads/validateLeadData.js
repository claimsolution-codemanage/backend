import Joi from "joi"


export const validateLeadData =(body)=>{
  const bodySchema = Joi.object({
    name:Joi.string().allow('').optional(),
    mobileNo:Joi.string().allow('').optional(),
    email:Joi.string().email().allow('').optional(),
    source:Joi.string().allow('').optional(),
    status:Joi.string().allow('').optional(),
    remarks:Joi.string().allow('').optional(),
    notes:Joi.string().allow('').optional(),
   })
 
   return bodySchema.validate(body)
}
