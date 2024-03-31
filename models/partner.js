import mongoose from "mongoose";
import jwt from 'jsonwebtoken'

const partnerSchema = new mongoose.Schema({
   fullName: {
      type: String,
      required: true,
   },
   email: {
      type: String,
      required: true,
   },
   mobileNo: {
      type: String,
      required: true,
   },
   workAssociation: {
      type: String,
      required: true,
   },
   areaOfOperation: {
      type: String,
      required: true,
   },
   password:{
   type:String,
   default:""
   },
   recentLogin:{type:String,default:new Date()},
   lastLogin:{type:String,default:new Date()},
    mobileVerify:{
      type:Boolean,
      default:false
   },
   mobileOTP: {
      type: {
         otp:{type:String,default:""},
         createAt:{type:Date,default:null}
      },
   },
   forgotPasswordOTP: {
      type: {
         otp:{type:String,default:""},
         createAt:{type:Date,default:null},
         verify:{type:Boolean,default:false}
      },
   },
   emailVerify:{
      type:Boolean,
      default:false
   },
   acceptPartnerTls:{
      type:Boolean,
      default:false
   },
   acceptTnc:{
      type:Boolean,
      default:false
   },
   emailOTP: {
      type: {
         otp:{type:String,default:""},
         createAt:{type:Date,default:null}
      },
   },
   isActive:{
    type:Boolean,
    default: false
   },
   profileTag: {
      type: String,
      default:""
   },
   profile: {
      profilePhoto: {
         type: String,
      },
      consultantName: {
         type: String,
      },
      consultantCode: {
         type: String,
      },
      associateWithUs:{
         type: Date,
      },
      workAssociation:{
         type: String,
      },
      primaryEmail: {
         type: String,
      },
      alternateEmail: {
         type: String,
      },
      primaryMobileNo: {
         type: String,
      },
      whatsupNo: {
         type: String,
      },
      alternateMobileNo: {
         type: String,
      },
      panNo: {
         type: String,
      },
      aadhaarNo: {
         type: String,
      },
      dob: {
         type: Date,
      },
      gender: {
         type: String,
      },
      businessName: {
         type: String,
      },
      companyName: {
         type: String,
      },
      natureOfBusiness: {
         type: String,
      },
      designation: {
         type: String,
      },
      areaOfOperation: {
         type: String,
      },
      state: {
         type: String,
      },
      district: {
         type: String,
      },
      city: {
         type: String,
      },
      pinCode: {
         type: String,
      },
      about: {
         type: String,
         maxlength:250
      },
   },
   bankingDetails: {
      bankName: {
         type: String,
      },
      bankAccountNo: {
         type: String,
      },
      bankBranchName: {
         type: String,
      },
      gstNo: {
         type: String,
      },
      panNo: {
         type: String,
      },
      cancelledChequeImg: {
         type: String,
      },
      gstCopyImg: {
         type: String,
      },
      ifscCode:{
         type: String,
      },
      upiId:{
         type: String,
      },
   },
   tlsUrl:{
      type:String,default:""
   },
   salesId:{
      type:mongoose.Schema.ObjectId,
      ref:"Employee",
   },
   shareEmployee:{type:Array,default:[]},
},{timestamps:true});

partnerSchema.methods.getAuth = function(auth=false){
 return jwt.sign({_id: this._id,fullName:this.fullName,email:this.email,role:"partner", mobileNo:this.mobileNo,isLogin:auth},process.env.PARTNER_SECRET_KEY)
}


const Partner = mongoose.model("Partner", partnerSchema);

export default Partner;
