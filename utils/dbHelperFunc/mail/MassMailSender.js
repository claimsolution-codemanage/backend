import Client from "../../../models/client.js";
import Partner from "../../../models/partner.js";
import Employee from "../../../models/employee/employeeModel.js";
import { sendAwsMail } from "../../sendMail.js";
import { massMailTemplate } from "../../emailTemplates/massMail/massMailTemplate.js";

const MASS_MAIL_RATE_PER_SECOND = 10;

const VALID_GROUPS = [
    "client",
    "partner",
    "employee",
    "Sathi Team",
    "surveyor",
    "advocate",
];

const EMPLOYEE_EXCLUDED_TYPES = ["Sathi Team", "surveyor", "advocate"];

/**
 * Sleep helper for throttling
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Split array into chunks
 */
const chunkArray = (arr = [], size = 1) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

/**
 * Normalize email
 */
const normalizeEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    return email.trim().toLowerCase();
};

const buildAttachments = (attachments = []) => {
    if (!Array.isArray(attachments)) return [];

    return attachments
        .map((file) => {
            if (!file) return null;

            // case 1: storage/file path
            if (file.url) {
                return {
                    filename: file.filename || "attachment",
                    path: file.url,
                    contentType: file.mimeType || undefined,
                };
            }

            // case 2: base64 content
            if (file.content) {
                return {
                    filename: file.filename || "attachment",
                    content: Buffer.from(file.content, "base64"),
                    contentType: file.contentType || undefined,
                };
            }

            return null;
        })
        .filter(Boolean);
};

/**
 * Get recipient emails based on group
 */
const getRecipientEmailsByGroup = async (group) => {
    switch (group) {
        case "client": {
            const clients = await Client.find(
                {
                    isActive: true,
                    email: { $exists: true, $ne: null, $ne: "" },
                },
                { email: 1 }
            ).lean();

            return clients.map((item) => item.email);
        }

        case "partner": {
            const partners = await Partner.find(
                {
                    isActive: true,
                    email: { $exists: true, $ne: null, $ne: "" },
                },
                { email: 1 }
            ).lean();

            return partners.map((item) => item.email);
        }

        case "employee": {
            const employees = await Employee.find(
                {
                    isActive: true,
                    email: { $exists: true, $ne: null, $ne: "" },
                    type: { $nin: EMPLOYEE_EXCLUDED_TYPES.map(type => new RegExp(`^${type}$`, "i")) }
                },
                { email: 1 }
            ).lean();

            return employees.map((item) => item.email);
        }

        case "stm":
        case "surveyor":
        case "advocate": {
            const employees = await Employee.find(
                {
                    isActive: true,
                    email: { $exists: true, $ne: null, $ne: "" },
                    type: { $regex: group, $options: "i" },
                },
                { email: 1 }
            ).lean();

            return employees.map((item) => item.email);
        }

        default:
            return [];
    }
};

const processMassMailCampaign = async ({ group, subject, content, mailAttachments, batches, recipientCount }) => {
    try {
        let successCount = 0;
        let failCount = 0;
        const failedEmails = [];
        const sentEmails = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            // send 14 emails in parallel
            const batchResults = await Promise.allSettled(
                batch.map((email) =>
                    sendAwsMail({
                        to: email,
                        subject,
                        html: massMailTemplate(content),
                        attachments: mailAttachments,
                    })
                )
            );

            batchResults.forEach((result, index) => {
                const email = batch[index];
                if (
                    result.status === "fulfilled" &&
                    result.value &&
                    result.value.success
                ) {
                    successCount += 1;
                    sentEmails.push(email);
                } else {
                    failCount += 1;
                    failedEmails.push({
                        email,
                        error:
                            result.status === "fulfilled"
                                ? result.value?.error?.message || "Mail sending failed"
                                : result.reason?.message || "Unexpected error",
                    });
                }
            });

            // wait 1 second before next batch (except last batch)
            if (i < batches.length - 1) {
                await delay(1000);
            }
        }

        await sendAwsMail({
            to: process.env.CC_MAIL_ID,
            subject: `Mass Mail Report for ${group}`,
            html: massMailTemplate(`
                <h4>Subject: ${subject}</h4>
                <div style="white-space: pre-wrap;"><b>Content:</b></br>${content}</div>
                <p><b>Group: ${group}</b></p>
                <p><b>Total Recipients: ${recipientCount}</b></p>
                <p><b>Total Sent: ${successCount}</b></p>
                <p><b>Total Failed: ${failCount}</b></p>
                <p><b>Failed Emails:</b></p>
                <ul>
                    ${failedEmails.map((email) => `<li>${email.email}</li>`).join("")}
                </ul>
            `),
            attachments: mailAttachments,
        })

    } catch (error) {
        console.log("error in processMassMailCampaign", error)
    }
}

export const CommanMassMailSender = async (req, res) => {
    try {
        const { group, subject, content, attachments = [], } = req.body;

        // 1) validations
        if (!group || !VALID_GROUPS.includes(group)) {
            return res.status(400).json({
                success: false,
                message: `Invalid group. Allowed values: ${VALID_GROUPS.join(", ")}`,
            });
        }

        if (!subject || !String(subject).trim()) {
            return res.status(400).json({
                success: false,
                message: "Subject is required",
            });
        }

        if (!content || !String(content).trim()) {
            return res.status(400).json({
                success: false,
                message: "Email content is required",
            });
        }

        // 2) fetch recipients
        const rawEmails = await getRecipientEmailsByGroup(group);

        // 3) normalize + dedupe + remove invalid
        const recipientEmails = [...new Set(rawEmails.map(normalizeEmail).filter(Boolean))];

        if (!recipientEmails.length) {
            return res.status(404).json({
                success: false,
                message: `No recipients found for group "${group}"`,
            });
        }

        // 4) build attachments for nodemailer
        const mailAttachments = buildAttachments(attachments);

        // 5) chunk emails by 14 per second
        const batches = chunkArray(recipientEmails, MASS_MAIL_RATE_PER_SECOND);

        processMassMailCampaign({ group, subject, content, mailAttachments, batches, recipientCount: recipientEmails.length })

        return res.status(200).json({
            success: true,
            message: "Mass mail processed",
        });
    } catch (error) {
        console.error("sendMassMail error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send mass mail",
            error: error.message,
        });
    }
};