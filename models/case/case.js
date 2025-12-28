import mongoose from "mongoose";

const caseSchema = new mongoose.Schema({
   consultantCode:{type:String},
   partnerId:{type:String},
   partnerCode:{type:String},
   partnerObjId:{
         type:mongoose.Schema.ObjectId,
         ref:"Partner"
   },
   partnerName:{type:String},
   clientId:{type:String},
   clientObjId:{
         type:mongoose.Schema.ObjectId,
         ref:"Client"
   },
   empSaleId:{type:String},
   empSaleName:{type:String},
   empId:{type:String},
   empObjId:{
         type:mongoose.Schema.ObjectId,
         ref:"Employee"
   },
   caseFrom:{type:String,required:"true"},
   acceptPayment:{type:Boolean,default:false,required:"true"},
   pendingPayment:{type:Boolean,default:false,required:"true"},
   isPartnerReferenceCase:{
      type:Boolean,default:false
   },
   partnerReferenceCaseDetails:{
      type:Object,default:{}
   },
   isEmpSaleReferenceCase:{
      type:Boolean,default:false
   },
   empSaleReferenceCaseDetails:{
      type:Object,default:{}
   },
   name:{type:String,required:"true"},
   fatherName:{type:String},
   email:{type:String},
   mobileNo:{type:String,required:"true"},
   policyType:{type:String},
   insuranceCompanyName:{type:String},
   complaintType:{type:String},
   policyNo:{type:String},
   address:{type:String},
   DOB:{type:Date},
   pinCode:{type:String},
   claimAmount:{type:Number,required:"true"},
   city:{type:String},
   state:{type:String},
   problemStatement:{type:String},
   isActive:{type:Boolean,required:true,default:true},
   fileNo:{type:String,required:true},
   currentStatus:{type:String,required:true,default:"pending"},
   // processSteps:{type:[{
   //    date:{type:Date,default:Date.now()},
   //    status:{type:String,default:"pending"},
   //    remark:{type:String,default:"pending stage."},
   //    consultant:{type:String,default:""},
   // }]},
   // caseDocs:{
   //    type:[
   //       {docDate:{type:String},
   //       docName:{type:String},
   //       docType:{type:String},
   //       docFormat:{type:String},
   //       docFormat:{type:String},
   //       docURL:{type:String},
   //       isMerge:{type:String,default:false},
   //    },
   //    ]
   // },
   addEmployee:{type:Array,default:[]},
   // caseCommit:{type:[{
   //    _id:{type:String},
   //    name:{type:String},
   //    role:{type:String},
   //    type:{type:String},
   //    commit:{type:String},
   //    Date:{type:Date}
   // }]},
   branchId:{
      type:String,
      default:"",
   },
   nextFollowUp:{type:Date,default:null},
   lastStatusDate:{type:Date,default:Date.now()},


},{timestamps:true});



const Case = mongoose.model("Case", caseSchema);

export default Case;
