export const emiPaymentReminderTemplate = ({
    clientName,
    amount,
    dueDate,
    fileNumber,
    insuranceCompany,
    policyNumber,
    supportEmail = 'help@claimsolution.in',
    supportPhone = '+91 9220906999',
}) => {
    return `
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8" />

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>
            EMI Payment Reminder
        </title>

        <style>

            body {
                margin: 0;
                padding: 0;
                background-color: #f4f7fb;
                font-family: 'Segoe UI', Roboto, Arial, sans-serif;
                color: #1f2937;
            }

            .container {
                width: 100%;
                padding: 40px 15px;
                box-sizing: border-box;
            }

            .email-wrapper {
                max-width: 650px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 18px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.06);
                border: 1px solid #e5e7eb;
            }

            .header {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                padding: 30px 25px;
                text-align: center;
                color: #ffffff;
            }

            .logo {
                margin-bottom: 18px;
            }

            .logo img {
                max-width: 170px;
                background: #ffffff;
                padding: 8px 12px;
                border-radius: 12px;
            }

            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }

            .header p {
                margin-top: 10px;
                font-size: 15px;
                opacity: 0.95;
                line-height: 1.5;
            }

            .body {
                padding: 35px 30px;
            }

            .greeting {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 15px;
                color: #111827;
            }

            .message {
                font-size: 15px;
                line-height: 1.7;
                color: #4b5563;
                margin-bottom: 28px;
            }

            .highlight-box {
                background: linear-gradient(
                    135deg,
                    #eff6ff,
                    #dbeafe
                );

                border: 1px solid #bfdbfe;

                border-radius: 16px;

                padding: 24px;

                text-align: center;

                margin-bottom: 30px;
            }

            .highlight-label {
                font-size: 14px;
                color: #1d4ed8;
                font-weight: 600;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .highlight-amount {
                font-size: 36px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 8px;
            }

            .highlight-date {
                font-size: 15px;
                color: #374151;
            }

            .details-card {
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                overflow: hidden;
                margin-bottom: 28px;
            }

            .details-header {
                background: #f9fafb;
                padding: 16px 20px;
                font-size: 16px;
                font-weight: 600;
                border-bottom: 1px solid #e5e7eb;
                color: #111827;
            }

            .detail-row {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                padding: 16px 20px;
                border-bottom: 1px solid #f3f4f6;
            }

            .detail-row:last-child {
                border-bottom: none;
            }

            .detail-label {
                font-size: 14px;
                color: #6b7280;
                font-weight: 500;
            }

            .detail-value {
                font-size: 14px;
                color: #111827;
                font-weight: 600;
                text-align: right;
            }

            .note-box {
                background: #f9fafb;
                border-left: 4px solid #2563eb;
                padding: 18px;
                border-radius: 10px;
                margin-top: 25px;
            }

            .note-box p {
                margin: 0;
                font-size: 14px;
                line-height: 1.7;
                color: #4b5563;
            }

            .footer {
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                padding: 25px;
                text-align: center;
            }

            .footer p {
                margin: 6px 0;
                font-size: 13px;
                color: #6b7280;
                line-height: 1.6;
            }

            .footer a {
                color: #2563eb;
                text-decoration: none;
                font-weight: 600;
            }

            .support-box {
                margin-top: 12px;
                font-size: 13px;
                color: #4b5563;
            }

            @media (max-width: 600px) {

                .body {
                    padding: 25px 18px;
                }

                .header {
                    padding: 25px 18px;
                }

                .highlight-amount {
                    font-size: 30px;
                }

                .detail-row {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .detail-value {
                    text-align: left;
                }
            }

        </style>
    </head>

    <body>

        <div class="container">

            <div class="email-wrapper">

                <!-- HEADER -->

                <div class="header">

                    <div class="logo">
                        <img 
                            src="https://panel.claimsolution.in/Images/icons/company-logo.png" 
                            alt="Claim Solution"
                        />
                    </div>

                    <h1>
                        EMI Payment Reminder
                    </h1>

                    <p>
                        Friendly reminder regarding your upcoming installment payment.
                    </p>

                </div>

                <!-- BODY -->

                <div class="body">

                    <div class="greeting">
                        Hello ${clientName},
                    </div>

                    <div class="message">
                        This is a reminder that your upcoming installment payment is due in the next <b>2 days</b>. 
                        Please review the payment details below and ensure timely payment to avoid any interruption or delay in your case processing.
                    </div>

                    <!-- HIGHLIGHT -->

                    <div class="highlight-box">

                        <div class="highlight-label">
                            Upcoming Installment Amount
                        </div>

                        <div class="highlight-amount">
                            ₹${amount}
                        </div>

                        <div class="highlight-date">
                            Due Date: <b>${dueDate}</b>
                        </div>

                    </div>

                    <!-- DETAILS -->

                    <div class="details-card">

                        <div class="details-header">
                            Installment Details
                        </div>

                        <div class="detail-row">
                            <div class="detail-label">
                                File Number
                            </div>

                            <div class="detail-value">
                                ${fileNumber}
                            </div>
                        </div>

                        <div class="detail-row">
                            <div class="detail-label">
                                Insurance Company
                            </div>

                            <div class="detail-value">
                                ${insuranceCompany}
                            </div>
                        </div>

                        <div class="detail-row">
                            <div class="detail-label">
                                Policy Number
                            </div>

                            <div class="detail-value">
                                ${policyNumber}
                            </div>
                        </div>
                    </div>

                    <!-- NOTE -->

                    <div class="note-box">

                        <p>
                            If you have already completed the payment recently, please ignore this email. 
                            For any questions regarding your payment schedule or case details, feel free to contact our support team.
                        </p>

                    </div>

                </div>

                <!-- FOOTER -->

                <div class="footer">

                    <p>
                        You are receiving this email because you are registered with 
                        <a href="https://www.claimsolution.in">
                            ClaimSolution.in
                        </a>
                    </p>

                    <p>
                        © ${new Date().getFullYear()} 
                        <a href="https://www.claimsolution.in">
                            ClaimSolution.in
                        </a>. 
                        All rights reserved.
                    </p>

                    <div class="support-box">

                        Need help?

                        <br />

                        Email: 
                        <a href="mailto:${supportEmail}">
                            ${supportEmail}
                        </a>

                        <br />

                        Contact: 
                        <a href="tel:${supportPhone}">
                            ${supportPhone}
                        </a>

                    </div>

                </div>

            </div>

        </div>

    </body>

    </html>
    `;
};