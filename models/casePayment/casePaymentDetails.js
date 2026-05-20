import mongoose from "mongoose";

const casePaymentInfoSchema = new mongoose.Schema(
    {
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            required: true,
        },

        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
        },

        totalProcessingFee: {
            type: Number,
            required: true,
            set: (v) => Number(parseFloat(v).toFixed(2)),
        },

        gstOption: {
            type: Boolean,
            default: false,
        },

        gstPercent: {
            type: Number,
            default: 0,
        },

        totalAmountWithGst: {
            type: Number,
            required: true,
            set: (v) => Number(parseFloat(v).toFixed(2)),
        },

        totalEmi: {
            type: Number,
            default: 1,
        },

        emiAmount: {
            type: Number,
            required: true,
            set: (v) => Number(parseFloat(v).toFixed(2)),
        },

        advancePaid: {
            type: Number,
            default: 0,
            set: (v) => Number(parseFloat(v).toFixed(2)),
        },

        balanceAmount: {
            type: Number,
            required: true,
            set: (v) => Number(parseFloat(v).toFixed(2)),
        },

        nextDueDate: {
            type: Date,
            default: null,
        },

        paymentMode: {
            type: String,
            enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'],
            default: 'UPI',
        },

        reminderType: {
            type: String,
            enum: ['WhatsApp', 'SMS', 'Email', 'Call'],
            default: 'WhatsApp',
        },

        paymentStatus: {
            type: String,
            enum: ['Pending', 'Partial Paid', 'Completed'],
            default: 'Pending',
        },

        paymentBasedOnDate: {
            type: Boolean,
            default: false,
        },

        advocateMode: {
            type: Boolean,
            default: false,
        },

        remarks: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const CasePaymentInfo = mongoose.model("case_payments", casePaymentInfoSchema);

export default CasePaymentInfo;