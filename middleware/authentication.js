import jwt from 'jsonwebtoken'
import jwtDecode from 'jwt-decode'
import Employee from '../models/employee.js'
import { Messages } from '../utils/constant.js'
import Admin from '../models/admin.js'

export const authPartner = async(req,res)=>{
   // console.log("header",req.headers);
   if(!req.headers["x-auth-token"]) return {success:false,message:"UnAuth token"}

   const token = req.headers["x-auth-token"]
   console.log("token",token);

   try {
      await jwt.verify(token,process.env.PARTNER_SECRET_KEY)
      const decode = await jwtDecode(token)
      req.user =decode
      console.log("decode",decode);
      return {success:true,message:"auth token verified"}
   } catch (error) {
      return {success:false,message:"Access Denied"}
   }

}


export const authAdmin = async (req, res, next) => {
   const token = req?.headers["x-auth-token"]
   if (!token) return res.status(401).json({ success: false, message: Messages?.un_auth_token })

   try {
      let payload = await jwt.verify(token, process.env.ADMIN_SECRET_KEY)
      let _id = payload?._id
      if (!_id) {
         return res.status(401).json({ success: false, message: Messages?.un_auth_token })
      }
      const admin = await Admin.findById(_id).select("-password")
      if (!admin) return res.status(401).json({ success: false, message: Messages?.account_not_found })
      if (!admin?.isActive) return res.status(401).json({ success: false, message: Messages?.account_not_active })
      req.admin = admin
      req.user = { _id }
      console.log(payload);
      next()
   } catch (error) {
      console.log("error", error);
      return res.status(401).json({ success: false, message: Messages?.access_denied })
   }

}

export const authEmployee = async (req, res, next) => {
   const token = req?.headers["x-auth-token"]
   if (!token) return res.status(401).json({ success: false, message: Messages?.un_auth_token })
   try {
      let payload = await jwt.verify(token, process.env.EMPLOYEE_SECRET_KEY)
      let _id = payload?._id
      if(!_id){
         return res.status(401).json({ success: false, message: Messages?.un_auth_token })
      }
      const employee = await Employee.findById(_id)
      if (!employee) return res.status(401).json({ success: false, message: Messages?.account_not_found })
      if (!employee?.isActive) return res.status(401).json({ success: false, message:Messages?.account_not_active})
      req.employee = employee
      req.user = {_id}
      console.log(payload);
      next()
   } catch (error) {
      return res.status(401).json({ success: false, message:Messages?.access_denied})
   }

}

export const authClient = async(req,res)=>{
   // console.log("header",req.headers);
   if(!req.headers["x-auth-token"]) return {success:false,message:"UnAuth token"}

   const token = req.headers["x-auth-token"]
   console.log("token",token);

   try {
      await jwt.verify(token,process.env.CLIENT_SECRET_KEY)
      const decode = await jwtDecode(token)
      req.user =decode
      console.log("decode",decode);
      return {success:true,message:"auth token verified"}
   } catch (error) {
      return {success:false,message:"Access Denied"}
   }

}