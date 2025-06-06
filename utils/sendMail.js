import nodemailer from "nodemailer";
//for gmail configuration
import dotenv from "dotenv";
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

export const sendOTPMail = (email, otp,type) => {
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		subject: "Account verification",
		html: OTPMail_HTML_TEMPLATE(email, otp,type),
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
		html: forgetPasswordMail_HTML_TEMPLATE(email,link),
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


export const sendAccountTerm_ConditonsMail = (email,as,pdfBytes) => {
	console.log("mail option",email,as);
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to: email,
		cc:process.env.CC_MAIL_ID,
		subject: "Service Agreement",
		html: sendCompanyTLS(as),
		// attachments: [{
		// 	filename: 'service_agreement.pdf',
		// 	path: fileURL,
		// 	contentType: 'application/pdf'
		//   }],
		attachments: [{
            filename: 'service_agreement.pdf',
            content: pdfBytes,
            encoding: 'base64'
        }]
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

const OTPMail_HTML_TEMPLATE = (email, otp,type) => {
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
					<h1>Account verification</h1>
				 </div>
				 <div class="email-body">
				 <p>Account Email: ${email}</p>
				 <h4>Account verification OTP: ${otp}</h4>
				 <p>This mail for ${type} account verification</p>
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

 const  forgetPasswordMail_HTML_TEMPLATE=(email,link)=>{
	return `
	  <!DOCTYPE html>
	  <html>
		 <head>
			<meta charset="utf-8">
			<title>Forget Password</title>
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
			.btn {
				display: inline-block;
				padding: 10px 20px;
				font-size: 16px;
				color: #ffffff;
				background-color: #007bff;
				text-decoration: none;
				border-radius: 5px;
				margin-top: 20px;
			}
			.btn:hover {
				background-color: #0056b3;
			}
			</style>
		 </head>
		 <body>
			<div class="container">
			  <div class="email">
				 <div class="email-header">
					<h1>Forget Password</h1>
				 </div>
				 <div class="email-body">
				 <p>Forget password email ${email}</p>
				 <a href="${process.env.PANEL_FRONTEND_URL+link}" class="btn">Click here</a>
				 <p> Don't share this mail with anyone. It content sensitive information of your account</p>
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

 const sendCompanyTLS =(as)=>{
	return`
	<!DOCTYPE html>
<html>
   <head>
      <meta charset="utf-8">
      <title>${process.env.COMPANY_NAME} Service Agreement</title>
      <style>
        .container {
           width: 100%;
           height: 100%;
           background-color: #f4f4f4;
        }
        .email {
           width: 70%;
           margin: 0 auto;
           background-color: #fff;
        }
        .email-header {
           background-color: #333;
           color: #fff;
           padding: 5px;
           text-align: center;
        }
        .email-body {
           padding: 20px;
        }
        .email-footer {
            display: flex;
           background-color: #333;
           color: #fff;
           padding: 20px;
           align-items: center;
           justify-content: center;
           text-align: center;
        }
        .btn-accept{
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .btn{
            background-color: blue;
            color: white;
            cursor: pointer;
            width: 20%;
            padding: 10px;
            border-radius: 5px;
            outline: none;
            text-align: center;
            text-decoration: none;
        }
      </style>
   </head>
   <body>
      <div class="container">
        <div class="email">
           <div class="email-header">
              <h1>${process.env.COMPANY_NAME} Service Agreement</h1>
           </div>
           <div class="email-body">
            <p>
                You are getting this mail because you signup on claimsolution.in as a ${as}. We also attached our service agreement pdf file  with this mail.
                <br>For your futher reference and guide regarding claimsolution.
            </p>
			<h4>The effective date of your service agreement is ${new Date().getDate()}/${new Date().getMonth()+1}/${new Date().getFullYear()}</h4>
           <p>For more info visit at <a href="https://www.claimsolution.in">claimsolution.in</a></p>
           </div>
           <div class="email-footer">
		   <a href="www.claimsolution.in">claimsolution</a>
           </div>
        </div>
      </div>
   </body>
</html>
	`
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

 
 export function  generateNotificationTemplate(customMessage, notificationUrl,notificationAdminUrl) {
    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      .email-header {
        background-color: #007bff;
        color: #ffffff;
        text-align: center;
        padding: 20px;
        font-size: 24px;
      }
      .email-body {
        padding: 20px;
        color: #333333;
        line-height: 1.6;
      }
      .email-footer {
        background-color: #f8f8f8;
        text-align: center;
        padding: 10px;
        font-size: 12px;
        color: #666666;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        font-size: 16px;
        color: #ffffff;
        background-color: #007bff;
        text-decoration: none;
        border-radius: 5px;
        margin-top: 20px;
      }
      .btn:hover {
        background-color: #0056b3;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <h4 class="email-header">
        Notification
      </h4>
      <div class="email-body">
        <p>Dear Team,</p>
        <p>${customMessage}</p>
        <p>Click the button below to view the full details</p>
        <a href="${notificationUrl}" class="btn">View Notification</a>
		<br/>
		<p>For Admin Only</p>
		<a href="${notificationAdminUrl}" class="btn">View Admin Notification</a>
        <p>Best regards, <br> The Claimsolution Team</p>
      </div>
      <div class="email-footer">
	  <a href="www.claimsolution.in">www.claimsolution.in</a>
	  <br/>
        &copy; ${new Date().getFullYear()} Claimsolution. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
  }
  