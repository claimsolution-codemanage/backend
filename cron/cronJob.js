import dotenv from "dotenv";
dotenv.config();
import cron from 'node-cron';
import moment from 'moment-timezone';
import CasePaymentScheduleDetail from '../models/casePayment/casePaymentSchedule.js';
import { sendMail } from '../utils/sendMail.js';
import { emiPaymentReminderTemplate } from '../utils/emailTemplates/paymentReminder/paymentReminderTemplate.js';


const sendPaymentReminder = async () => {
    try {
        console.log('PAYMENT REMINDER CRON STARTED');

        const indiaNow = moment().tz('Asia/Kolkata');

        const targetDate = indiaNow.clone().add(2, 'days').startOf('day');

        const targetDateEnd = indiaNow.clone().add(2, 'days').endOf('day');

        console.log('TARGET DATE:', targetDate.toDate());

        const schedules = await CasePaymentScheduleDetail.aggregate([
            {
                $match: {
                    dueDate: {
                        $gte: targetDate.toDate(),
                        $lte: targetDateEnd.toDate(),
                    },
                    type: 'emi',
                    status: { $ne: 'Paid' },
                },
            },
            // PAYMENT DETAIL
            {
                $lookup: {
                    from: 'case_payments',
                    localField: 'casePaymentDetailId',
                    foreignField: '_id',
                    as: 'paymentDetail',
                    pipeline: [{ $project: { clientId: 1, caseId: 1 } }]
                },
            },
            { $unwind: '$paymentDetail' },
            // CLIENT DETAIL
            {
                $lookup: {
                    from: 'clients',
                    localField: 'paymentDetail.clientId',
                    foreignField: '_id',
                    as: 'clientDetail',
                    pipeline: [{ $project: { fullName: 1, email: 1, mobileNo: 1 } }]
                },
            },
            { $unwind: '$clientDetail' },
            // CASE DETAIL
            {
                $lookup: {
                    from: 'cases',
                    localField: 'paymentDetail.caseId',
                    foreignField: '_id',
                    as: 'caseDetail',
                    pipeline: [{ $project: { fileNo: 1, insuranceCompanyName: 1, policyNo: 1, } }

                    ],
                },
            },
            { $unwind: '$caseDetail' },
            // PROJECT
            {
                $project: {
                    amount: 1,
                    dueDate: 1,
                    clientName: '$clientDetail.fullName',
                    clientEmail: '$clientDetail.email',
                    fileNumber: '$caseDetail.fileNo',
                    policyNumber: '$caseDetail.policyNo',
                    insuranceCompany: '$caseDetail.insuranceCompanyName',
                },
            },
        ]);

        console.log(`TOTAL REMINDERS: ${schedules.length}`);

        for (const item of schedules) {
            if (!item.clientEmail) continue;

            const formattedDate = moment(item.dueDate).format('DD MMM YYYY');
            await sendMail({
                subject: "EMI Payment Reminder",
                to: item.clientEmail,
                html: emiPaymentReminderTemplate({ ...item, dueDate: formattedDate }),
            });
            console.log(`EMAIL SENT TO ${item.clientEmail}`);
        }
        console.log('PAYMENT REMINDER CRON COMPLETED');
    } catch (error) {
        console.log('CRON ERROR:', error);
    }
};

// START PAYMENT REMINDER CRON
const cronJobs = () => {
    if (process.env.NODE_ENV !== "production") return;
    // EVERY DAY 6:00 AM INDIA TIME
    cron.schedule('0 6 * * *', sendPaymentReminder, { timezone: 'Asia/Kolkata', });
};

export default cronJobs;