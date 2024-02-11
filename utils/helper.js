import mongoose from "mongoose";
import validateDate from "validate-date";
import Joi from "joi";

export const validMongooseId = (id)=>{
       return mongoose.Types.ObjectId.isValid(id)
}

export const otp6Digit = () => {
   let randomChars = '0123456789';
   let result = '';
   for ( let i = 0; i < 6; i++ ) {
       result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
   }
   return result;
}

export const generatePassword =()=>{
    const passwordValue = "qwertyuiopasdfghjklzxcvbnm!@#$%^&*ASDFGHJKLZXCVBNMQWERTYUIOP123456789"
    const passwordLength = 20
    let genratePass =""
    for(let i=0;i<=passwordLength;i++){
          genratePass += `${passwordValue[Math.floor(Math.random()*passwordValue.length)]}`
    }
    return genratePass
  }

export const getValidateDate =(date)=>{
    return validateDate(date,"boolean","yyyy/mm/dd"); 
}


export const getAllCaseQuery =(statusType,searchQuery,startDate,endDate,partnerId,clientId,employeeId,type=true)=>{
  console.log("parameter",statusType,searchQuery,startDate,endDate,partnerId,clientId,employeeId,type);
    if (startDate && endDate) {
        const validStartDate = getValidateDate(startDate)
        if(!validStartDate) return {success:false,message:"start date not formated"}
        const validEndDate = getValidateDate(endDate)
        if(!validEndDate) return {success:false,message:"end date not formated"}
      }
 
   let query = {
     $and:[
     partnerId ?  {partnerId:partnerId} : {},
     clientId ?  {clientId:clientId} : {},
     employeeId ?  {addEmployee:{$in:employeeId}} : {},
      {currentStatus: { $regex: statusType, $options: "i" }},
      {isActive:type},
      {$or: [
          { name: { $regex: searchQuery, $options: "i" }},
          { partnerName: { $regex: searchQuery, $options: "i" }},
          { consultantCode: { $regex: searchQuery, $options: "i" }},
          { fileNo: { $regex: searchQuery, $options: "i" }},
          { email: { $regex: searchQuery, $options: "i" }},
          { mobileNo: { $regex: searchQuery, $options: "i" }},
          { policyType: { $regex: searchQuery, $options: "i" }}
      ]},
      startDate && endDate ? {
       createdAt: { $gte: new Date(startDate).setHours(0, 0, 0, 0), 
         $lte: new Date(endDate).setHours(23, 59, 59, 999) }
   } : {}
     ]
  };

  // console.log("my-query",query);
  return {success:true,query:query}
}


export const getAllPartnerSearchQuery =(searchQuery,type)=>{
let query = {
    $and:[
      {isActive:type},
      {
      $or: [
              { "profile.consultantName": { $regex: searchQuery, $options: "i" }},
              { "profile.workAssociation": { $regex: searchQuery, $options: "i" }},
              { "profile.consultantCode": { $regex: searchQuery, $options: "i" }},
              { "profile.primaryMobileNo": { $regex: searchQuery, $options: "i" }},
              { "profile.primaryEmail": { $regex: searchQuery, $options: "i" }},
              { "profile.aadhaarNo": { $regex: searchQuery, $options: "i" }},
              { "profile.panNo": { $regex: searchQuery, $options: "i" }},
          ]
    }]
};
return query
}

export const getAllClientSearchQuery =(searchQuery,type)=>{
  let query = {
    $and:[
      {isActive:type},
      {
        $or: [
                { "profile.consultantName": { $regex: searchQuery, $options: "i" }},
                { "profile.fatherName": { $regex: searchQuery, $options: "i" }},
                { "profile.consultantCode": { $regex: searchQuery, $options: "i" }},
                { "profile.primaryMobileNo": { $regex: searchQuery, $options: "i" }},
                { "profile.primaryEmail": { $regex: searchQuery, $options: "i" }},
                { "profile.aadhaarNo": { $regex: searchQuery, $options: "i" }},
                { "profile.panNo": { $regex: searchQuery, $options: "i" }},
              ]
        },
    ]
  };
  return query
  }

  export const getAllEmployeeSearchQuery =(searchQuery)=>{
    let query = {
    $or: [
            { fullName: { $regex: searchQuery, $options: "i" }},
            { email: { $regex: searchQuery, $options: "i" }},
            { mobileNo: { $regex: searchQuery, $options: "i" }},
        ]
    };
    return query
    }

export const validateResetPassword =(body)=>{
  const resetPassword = Joi.object({
   password:Joi.string().min(8).required(),
   confirmPassword:Joi.string().required(),
  })
  return resetPassword.validate(body)
}

export const validateAddCaseFile =(body)=>{
  const resetPassword = Joi.object({
    docDate:Joi.string().allow('').optional(),
    docName:Joi.string().allow('').optional(),
    docType:Joi.string().allow('').optional(),
    docFormat:Joi.string().allow('').optional(),
    docURL:Joi.any().required(),
  })
  return resetPassword.validate(body)
}


export const validateAddComplaint =(body)=>{
  const bodySchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    mobileNo: Joi.string().required(),
    claim_type: Joi.string().allow('').optional(),
    complaint_type: Joi.string().allow('').optional(),
    complaint_brief: Joi.string().allow('').optional(),
   })
 
   return bodySchema.validate(body)
}
