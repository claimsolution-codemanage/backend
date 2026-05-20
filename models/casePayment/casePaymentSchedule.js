import mongoose from "mongoose";

const casePaymentScheduleDetailsSchema = new mongoose.Schema(
    {
        casePaymentDetailId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'case_payments',
            required: true,
        },

        type: {
            type: String,
            enum: ['emi', 'advance', 'custom'],
            default: 'emi',
        },

        amount: {
            type: Number,
            required: true,
            set: (v) => Number(parseFloat(v).toFixed(2)),
        },

        dueDate: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ['Pending', 'Upcoming', 'Paid', 'Overdue', 'Cancelled'],
            default: 'Upcoming',
        },

        paidDate: {
            type: Date,
            default: null,
        },

        paymentMode: {
            type: String,
            enum: ["", 'Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'],
            default: "",
        },

        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const casePaymentScheduleDetail = mongoose.model("case_payment_schedule_details", casePaymentScheduleDetailsSchema);

export default casePaymentScheduleDetail;
