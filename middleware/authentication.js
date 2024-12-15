import jwt from 'jsonwebtoken'
import jwtDecode from 'jwt-decode'

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


export const authAdmin = async(req,res)=>{
   // console.log("header",req.headers);
   if(!req.headers["x-auth-token"]) return {success:false,message:"UnAuth token"}

   const token = req.headers["x-auth-token"]
   console.log("token",token);

   try {
      await jwt.verify(token,process.env.ADMIN_SECRET_KEY)
      const decode = await jwtDecode(token)
      req.user =decode
      console.log("decode",decode);
      return {success:true,message:"auth token verified"}
   } catch (error) {
      return {success:false,message:"Access Denied"}
   }

}

export const authEmployee = async(req,res)=>{
   // console.log("header",req.headers);
   if(!req.headers["x-auth-token"]) return {success:false,message:"UnAuth token"}

   const token = req.headers["x-auth-token"]
   try {
      await jwt.verify(token,process.env.EMPLOYEE_SECRET_KEY)
      const decode = await jwtDecode(token)
      req.user =decode
      console.log("decode",decode);
      return {success:true,message:"auth token verified"}
   } catch (error) {
      return {success:false,message:"Access Denied"}
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