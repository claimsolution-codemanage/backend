import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const adminSchema = new mongoose.Schema({
   fullName:{type:String,required:true},
   email:{type:String,required:true},
   mobileNo:{type:String,required:true},
   password:{type:String,required:true},
   isActive:{type:Boolean,default:true,required:true},
   consultantFee:{type:Number,default:2000,required:true},
   partnerTlsUrl:{type:String,default:""},
   clientTlsUrl:{type:String,default:""},

},{timestamps:true});

adminSchema.methods.getAuth = function(superAdmin=false) {
 return Jwt.sign({_id:this._id,fullName:this.fullName,role:"Admin",superAdmin},process.env.ADMIN_SECRET_KEY)
}

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
