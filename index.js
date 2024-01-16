import express from "express";
import dotenv from "dotenv";
dotenv.config();
const app = express();
import mongoose from "mongoose";
import cors from 'cors'
import admin from './routes/admin.js'
import partner from './routes/partner.js'
import employee from './routes/employee.js'
import imageUpload from './routes/imageUpload.js' 
import client from './routes/client.js'
import job from './routes/job.js'

mongoose
	.connect(process.env.DB_URL)
	.then(() => console.log("Successfully connected"))
	.catch((err) => console.log(`error in connecting: ${err}`));

// app.use(express.static('public'));
app.use(cors())
// app.use(cors({
// 	origin:['https://www.claimsolution.in', 'http://www.claimsolution.in'],
// 	methods:['GET, POST, OPTIONS, PUT, PATCH, DELETE'],
// }));
// app.use((req, res, next) => {
// 	const allowedOrigins = ['https://www.claimsolution.in', 'http://www.claimsolution.in'];
// 	const origin = req.headers.origin;
  
// 	if (allowedOrigins.includes(origin)) {
// 	  res.setHeader('Access-Control-Allow-Origin', origin);
// 	}
  
// 	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
// 	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
// 	res.setHeader('Access-Control-Allow-Credentials', 'true');
  
// 	if (req.method === 'OPTIONS') {
// 	  // Respond to CORS preflight requests
// 	  res.sendStatus(204);
// 	} else {
// 	  next();
// 	}
//   });
app.use(express.json());

app.use("/api/upload",imageUpload)
app.use("/api/admin",admin)
app.use("/api/employee",employee)
app.use("/api/partner",partner)
app.use("/api/client",client)
app.use("/api/job",job)

app.get("/",(req,res)=>{
	res.status(200).json({success: true,message:"Welcome to server page!"});
})

// app.use("/api/payment",paymentRoutes)

const port = process.env.PORT;
app.listen(port, () => console.log("app is listening on port", port));
