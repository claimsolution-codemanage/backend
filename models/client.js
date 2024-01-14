import mongoose from "mongoose";
import jwt from 'jsonwebtoken'

const clientSchema = new mongoose.Schema({
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
   password:{
   type:String,
   default:""
   },
   mobileVerify:{
      type:Boolean,
      default:false
   },
   acceptClientTls:{
      type:Boolean,
      default:false
   },
   emailVerify:{
      type:Boolean,
      default:false
   },
   emailOTP: {
      type: {
         otp:{type:String,default:""},
         createAt:{type:Date,default:null}
      },
   },
   mobileOTP: {
      type: {
         otp:{type:String,default:""},
         createAt:{type:Date,default:null}
      },
   },
   isProfileCompleted:{type:Boolean,default:false},
   isActive:{
    type:Boolean,
    default: false
   },
   tlsUrl:{
      type:String,
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
         type:Date,
      },
      fatherName:{
        type:String
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
      address:{
        type:String},
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
      },
   },

},{timestamps:true});

clientSchema.methods.getAuth = function(auth=false){
 return jwt.sign({_id: this._id,fullName:this.fullName,role:"client",mobileNo:this.mobileNo, mobileVerify:this.mobileVerify,isLogin:auth,isProfileCompleted:this.isProfileCompleted},process.env.CLIENT_SECRET_KEY,{expiresIn:'24h'})
}


const Client = mongoose.model("Client", clientSchema);

export default Client;






