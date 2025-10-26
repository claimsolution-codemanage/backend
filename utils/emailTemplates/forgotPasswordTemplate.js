export const forgetPasswordTemplate = ({email,name="", link}) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password Reset Request</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f6f9fc;
          font-family: 'Segoe UI', Roboto, Arial, sans-serif;
          color: #333;
        }
        .container {
          width: 100%;
          padding: 40px 0;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #ffffff;
          text-align: center;
          padding: 10px 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        }
        .logo {
          text-align: center;
          margin: 10px;
        }
        .logo img {
          max-width: 150px;
          background-color:white;
          border-radius:10px;
        }
        .body {
          padding: 30px 25px;
          line-height: 1.6;
          text-align: center;
        }
        .body p {
          font-size: 15px;
          margin: 12px 0;
          color: #4b5563;
        }
        .btn {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          font-size: 16px;
          color: #ffffff !important;
          background-color: #2563eb;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
        }
        .btn:hover {
          background-color: #1d4ed8;
        }
        .footer {
          margin-top: 20px;
          background: #f9fafb;
          text-align: center;
          padding: 18px;
          font-size: 13px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        .footer a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="header">
          <div class="logo">
            <img src="https://panel.claimsolution.in/Images/icons/company-logo.png" alt="Company Logo" />
          </div>
            <h1>Password Reset</h1>
          </div>
          <div class="body">
            <p>Hello ${name || ""},</p>
            <p>We received a request to reset the password for your account <b>${email}</b>.</p>
            <p>If you made this request, click the button below to set a new password:</p>
            <a href="${process.env.PANEL_FRONTEND_URL + link}" class="btn">Reset My Password</a>
            <p>This link will expire in <b>30 minutes</b>. If you didn’t request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} <a href="https://www.claimsolution.in">${process.env.COMPANY_NAME || "ClaimSolution"}</a>. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};
