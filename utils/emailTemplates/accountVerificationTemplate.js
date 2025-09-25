export const accountVerificationTemplate = ({name, otp, type}) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Account Verification</title>
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
          padding: 30px 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        }
        .body {
          padding: 30px 25px;
          text-align: center;
        }
        .body h2 {
          font-size: 20px;
          margin-bottom: 10px;
          color: #111827;
        }
        .body p {
          font-size: 15px;
          color: #4b5563;
          margin: 8px 0;
          line-height: 1.5;
        }
        .otp-box {
          margin: 25px auto;
          display: inline-block;
          background: #f3f4f6;
          padding: 14px 28px;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 6px;
          border-radius: 8px;
          color: #1f2937;
          border: 2px dashed #2563eb;
        }
        .verify-link {
          display: inline-block;
          margin-top: 20px;
          font-size: 15px;
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
        .footer {
          margin-top: 30px;
          padding: 15px;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
        @media (max-width: 600px) {
          .body {
            padding: 20px 15px;
          }
          .otp-box {
            font-size: 20px;
            padding: 12px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="header">
            <h1>Account Verification</h1>
          </div>
          <div class="body">
            <h2>Hello ${name},</h2>
            <p>We’re excited to have you on board! To keep your ${type?.toLowerCase() || ""} account secure, please verify your account using the OTP below:</p>

            <div class="otp-box">${otp}</div>

            <p>This OTP is valid for the next <b>10 minutes</b>. For your security, please do not share it with anyone.</p>

            <a href="https://www.claimsolution.in" class="verify-link">Visit claimsolution.in to continue</a>
          </div>
          <div class="footer">
            <p>If you didn’t request this, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} <a href="https://www.claimsolution.in">ClaimSolution.in</a>. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};
