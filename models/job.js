import mongoose from "mongoose";
import Jwt from 'jsonwebtoken'


const jobSchema = new mongoose.Schema({
   title:{type:String,required:"true"},
   experience:{type:String,required:"true"},
   qualification:{type:String,required:"true"},
   about:{type:String,required:"true"},
   requirements:{type:String,required:"true"}

},{timestamps:true});


const Job = mongoose.model("Job", jobSchema);

export default Job;
