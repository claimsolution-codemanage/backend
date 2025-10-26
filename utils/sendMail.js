import nodemailer from "nodemailer";
//for gmail configuration
import dotenv from "dotenv";
import { forgetPasswordTemplate } from "./emailTemplates/forgotPasswordTemplate.js";
dotenv.config();
const transport = nodemailer.createTransport({
	host: "smtp.hostinger.com",
	port: 587,
	secure: false,
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS,
	},
});


// common
export const commonSendMail =(html,subject,to,bcc=[],cc=[])=>{
	const mailOptions = {
		from: process.env.GMAIL_USER, 
		to:to, 
		bcc:bcc,
		cc:cc,
		subject: subject || "Claim Solution",
		html: html,
	};
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject({ nodemailerError: error });
			} else {
				resolve({ nodemailerError: "" });
			}
		});
	});
}

export async function sendMail({ to, cc=[], bcc=[], subject, html, attachments=[] }) {
  try {
    const info = await transport.sendMail({
      from: `"Claim Solution" <${process.env.GMAIL_USER}>`,
      to,
      cc,
      bcc,
      subject,
      html,
      attachments,
    });
	console.log("mail sent",to,info);
	
    return { success: true, info };
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    return { success: false, error };
  }
}


export const sendAdminSigninMail = (password,email) => {
	const mailOptions = {

		from: process.env.GMAIL_USER,      // system mail
		to:process.env.ADMIN_MAIL_ID,      // admin mail
		subject: "Admin Account credentials",
		html: admin_signin_body(password,email),
	};
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject({ nodemailerError: error });
			} else {
				resolve({ nodemailerError: "" });
			}
		});
	});
};

export const sendEmployeeSigninMail = (email,password) => {
	const mailOptions = {

		from: process.env.GMAIL_USER,      // system mail
		to:email,      // employee mail
		subject: "Employee Account credentials",
		html: employee_signin_body(email,password),
	};
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject({ nodemailerError: error });
			} else {
				resolve({ nodemailerError: "" });
			}
		});
	});
};

export const sendForgetPasswordMail = (email,link) => {
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		subject: "Forget password",
		html: forgetPasswordTemplate({email,link}),
	};
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject({ nodemailerError: error });
			} else {
				resolve({ nodemailerError: "" });
			}
		});
	});
};

export const sendAddPartnerRequest = (email,link) => {
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		subject: "Partner request",
		html: addPartnerMail_HTML_TEMPLATE(link),
	};
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject({ nodemailerError: error });
			} else {
				resolve({ nodemailerError: "" });
			}
		});
	});
};

export const sendAddClientRequest = (email,link) => {
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		subject: "Client request",
		html: addClientMail_HTML_TEMPLATE(link),
	};
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject({ nodemailerError: error });
			} else {
				resolve({ nodemailerError: "" });
			}
		});
	});
};

 const admin_signin_body = (password,email) => {
	return `
	  <!DOCTYPE html>
	  <html>
		 <head>
			<meta charset="utf-8">
			<title>Account verification</title>
			<style>
			  .container {
				 width: 100%;
				 height: 100%;
				 padding: 20px;
				 background-color: #f4f4f4;
			  }
			  .email {
				 width: 80%;
				 margin: 0 auto;
				 background-color: #fff;
				 padding: 20px;
			  }
			  .email-header {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			  .email-body {
				 padding: 20px;
			  }
			  .email-footer {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			</style>
		 </head>
		 <body>
			<div class="container">
			  <div class="email">
				 <div class="email-header">
					<h1>Account credentials</h1>
				 </div>
				 <div class="email-body">
				 <h4>Account credentials</h4>
				 <p>Email: ${email}</p>
				 <p>Password: ${password}</p>
				 <p>This mail for admin account credentails.</p>
				 </div>
				 <div class="email-footer">
				 <a href="www.claimsolution.in">claimsolution.in</a>
				 </div>
			  </div>
			</div>
		 </body>
	  </html>
	`;
 }

 const employee_signin_body = (email,password) => {
	return `
	  <!DOCTYPE html>
	  <html>
		 <head>
			<meta charset="utf-8">
			<title>Employee Account credentials</title>
			<style>
			  .container {
				 width: 100%;
				 height: 100%;
				 padding: 20px;
				 background-color: #f4f4f4;
			  }
			  .email {
				 width: 80%;
				 margin: 0 auto;
				 background-color: #fff;
				 padding: 20px;
			  }
			  .email-header {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			  .email-body {
				 padding: 20px;
			  }
			  .email-footer {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			</style>
		 </head>
		 <body>
			<div class="container">
			  <div class="email">
				 <div class="email-header">
					<h1>Account credentials</h1>
				 </div>
				 <div class="email-body">
				 <p>Email:${email}</p>
				 <p>Password:${password}</p>
				 <p>This mail for employee account credentails.</p>
				 </div>
				 <div class="email-footer">
					<a href="www.claimsolution.in">claimsolution.in</a>
				 </div>
			  </div>
			</div>
		 </body>
	  </html>
	`;
 }

 const  addPartnerMail_HTML_TEMPLATE=(link)=>{
	return `
	  <!DOCTYPE html>
	  <html>
		 <head>
			<meta charset="utf-8">
			<title>Partner Request</title>
			<style>
			  .container {
				 width: 100%;
				 height: 100%;
				 padding: 20px;
				 background-color: #f4f4f4;
			  }
			  .email {
				 width: 80%;
				 margin: 0 auto;
				 background-color: #fff;
				 padding: 20px;
			  }
			  .email-header {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			  .email-body {
				 padding: 20px;
			  }
			  .email-footer {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			</style>
		 </head>
		 <body>
			<div class="container">
			  <div class="email">
				 <div class="email-header">
					<h1>Request to add as partner</h1>
				 </div>
				 <div class="email-body">
				 <p>Hi, You getting this mail to join claim solution as partner.</p>
				 <p>To accept partner request <a href=${process.env.FRONTEND_URL+link}>Click here.</a></p>
				 <p>For more information  <a href="www.claimsolution.in">${process.env.FRONTEND_URL_Base}</a></p>
				 </div>
				 <div class="email-footer">
					<a href="www.claimsolution.in">www.claimsolution.in</a>
				 </div>
			  </div>
			</div>
		 </body>
	  </html>
	`;
 }

 const  addClientMail_HTML_TEMPLATE=(link)=>{
	return `
	  <!DOCTYPE html>
	  <html>
		 <head>
			<meta charset="utf-8">
			<title>Client Request</title>
			<style>
			  .container {
				 width: 100%;
				 height: 100%;
				 padding: 20px;
				 background-color: #f4f4f4;
			  }
			  .email {
				 width: 80%;
				 margin: 0 auto;
				 background-color: #fff;
				 padding: 20px;
			  }
			  .email-header {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			  .email-body {
				 padding: 20px;
			  }
			  .email-footer {
				 background-color: #333;
				 color: #fff;
				 padding: 20px;
				 text-align: center;
			  }
			</style>
		 </head>
		 <body>
			<div class="container">
			  <div class="email">
				 <div class="email-header">
					<h1>Request to add as client</h1>
				 </div>
				 <div class="email-body">
				 <p>Hi, You getting this mail to join claim solution as client.</p>
				 <p>To accept client request <a href=${process.env.FRONTEND_URL+link}>Click here.</a></p>
				 <p>For more information  <a href="www.claimsolution.in">${process.env.FRONTEND_URL_Base}</a></p>
				 </div>
				 <div class="email-footer">
					<a href="www.claimsolution.in">www.claimsolution.in</a>
				 </div>
			  </div>
			</div>
		 </body>
	  </html>
	`;
 }


  