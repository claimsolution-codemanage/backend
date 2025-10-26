
export function notificationTemplate(customMessage, notificationUrl, notificationAdminUrl) {
  return `
    <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Notification</title>
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

         .email-body {
        padding: 20px;
        color: #333333;
        line-height: 1.6;
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
            <div class="logo">
            <img src="https://panel.claimsolution.in/Images/icons/company-logo.png" alt="Company Logo" />
          </div>
            <h1> Notification</h1>
          </div>
          <div class="">
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
}