export const revisedAgreementTemplate = ({ as, claimType = "", name }) => {
  const isPartner = as?.toLowerCase() === "partner"

  const getClaimName = (type) => {
    switch (type?.toLowerCase()) {
      case "gro":
        return "Grievance Redressal Officer (GRO)"
      default:
        return type
    }
  }

  return `
  
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${process.env.COMPANY_NAME} – Revised Service Agreement</title>
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
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          text-align: center;
          padding: 25px 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        }
        .body {
          padding: 30px 25px;
          line-height: 1.6;
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
        .body p {
          font-size: 15px;
          margin: 10px 0;
          color: #4b5563;
        }
        .highlight {
          background: #ecfdf5;
          padding: 12px 18px;
          border-left: 4px solid #10b981;
          border-radius: 6px;
          margin: 20px 0;
          font-size: 14px;
          color: #065f46;
        }
        .footer {
          background: #f9fafb;
          text-align: center;
          padding: 18px;
          font-size: 13px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
        }
        .company-link {
          display: inline-block;
          margin-top: 20px;
          font-size: 15px;
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
        .footer a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }
        @media (max-width: 600px) {
          .body {
            padding: 10px 10px;
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
            <h1>${process.env.COMPANY_NAME} – Revised Service Agreement</h1>
          </div>
          <div class="body">
            <p>Dear ${name || as || ""},</p>
            <p>We are pleased to inform you that your ${isPartner ? "Client's" : ""} case has been successfully approved by the ${getClaimName(claimType || "")}. 
            As part of this approval, we have updated and attached the <b>Revised ${as} Service Agreement</b> for your reference and records. </p>

            <div class="highlight">
              <b>Effective Date:</b> ${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}
            </div>

            <p>For more details, please visit our official website:</p>
            <p> 👉 <a class="company-link" href="https://www.claimsolution.in" target="_blank">www.claimsolution.in</a>
            </p>
          </div>
          <div>
          <p>Warm regards,</br>
          Team Claim Solution</p>
          </div>

          <div class="footer">
            <p> &copy; ${new Date().getFullYear()} 
              <a href="https://www.claimsolution.in">${process.env.COMPANY_NAME}</a>.  
              All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
  </html>

  `;
};
