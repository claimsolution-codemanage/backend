import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const employeeSchema = new mongoose.Schema({
   fullName:{type:String,required:"true"},
   empId:{type:String,default:""},
   branchId:{type:String,default:""},
   email:{type:String,required:"true"},
   mobileNo:{type:String,required:"true"},
   password:{type:String,required:"true"},
   type:{type:String,default:"Operation",required:true},
   referEmpId:{type:mongoose.Schema.ObjectId,ref:"Employee"},
   headEmpId:{type:mongoose.Schema.ObjectId,ref:"Employee"},
   managerId:{type:mongoose.Schema.ObjectId,ref:"Employee"},
   designation:{type:String,default:"Executive",required:true},
   bankName:{type:String,default:""},
   bankBranchName:{type:String,default:""},
   bankAccountNo:{type:String,default:""},
   panNo:{type:String,default:""},
   address:{type:String,default:""},
   profileImg:{type:String,default:""},
   dob:{type:Date,default:new Date()},
   gender:{type:String,default:""},
   district:{type:String,default:""},
   city:{type:String,default:""},
   state:{type:String,default:""},
   pinCode:{type:String,default:""},
   isActive:{type:"boolean",default:true,required:"true"}
},{timestamps:true});

employeeSchema.methods.getAuth = function() {
 return Jwt.sign({_id:this._id,empId:this.empId,branchId:this.branchId,fullName:this.fullName,role:"Employee",empType:this.type,designation:this.designation},process.env.EMPLOYEE_SECRET_KEY)
}
const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;