import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
   caseId:{type:mongoose.Schema.ObjectId,ref:"Case"},
   message:{type:String},
   adminIds:{type:Array},
   empIds:{type:Array},
   type:{
      type:String,
      default:"Case"
   },
   isActive:{type:Boolean,default:true},
   branchId:{
      type:String,
      default:"",
   }

},{timestamps:true});



const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
