 
 export function notificationTemplate(customMessage, notificationUrl,notificationAdminUrl) {
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