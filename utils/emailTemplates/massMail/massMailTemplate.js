export const massMailTemplate = (content) => {
    return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Claim Solution</title>
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
          border:1px solid #3b82f6;
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
          </div>
          <div class="body">
            ${content || ""}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} <a href="https://www.claimsolution.in">ClaimSolution.in</a>. All rights reserved.</p>
             Need help? Contact us at <a href="mailto:help@claimsolution.in">help@claimsolution.in</a></p>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
};
