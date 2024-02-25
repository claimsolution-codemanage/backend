import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const employeeSchema = new mongoose.Schema({
   fullName:{type:String,required:"true"},
   email:{type:String,required:"true"},
   mobileNo:{type:String,required:"true"},
   password:{type:String,required:"true"},
   type:{type:String,default:"Operation",required:true},
   designation:{type:String,default:"Executive",required:true},
   isActive:{type:"boolean",default:true,required:"true"}
},{timestamps:true});

employeeSchema.methods.getAuth = function() {
 return Jwt.sign({_id:this._id,fullName:this.fullName,role:"Employee",empType:this.type,designation:this.designation},process.env.EMPLOYEE_SECRET_KEY)
}
const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;