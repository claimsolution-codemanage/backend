import Joi from "joi"

export const validateStatement = (body) => {
    const bodySchema = Joi.object({
        _id: Joi.string().allow('').optional(),
        empId: Joi.string().allow('').optional(),
        PartnerId: Joi.string().allow('').optional(),
        empId: Joi.string().allow('').optional(),
        caseLogin: Joi.number().required(),
        policyHolder: Joi.string().required(),
        fileNo: Joi.string().required(),
        policyNo: Joi.string().required(),
        insuranceCompanyName: Joi.string().required(),
        claimAmount: Joi.number().required(),
        approvedAmt: Joi.number().required(),
        constultancyFee: Joi.number().required(),
        TDS: Joi.string().allow('').optional(),
        modeOfLogin: Joi.string().allow('').optional(),
        payableAmt: Joi.number().required(),
        utrDetails: Joi.string().allow('').optional(),
        fileUrl: Joi.string().allow('').optional(),
        branchId: Joi.string().allow('').optional(),
    })
    return bodySchema.validate(body)
}