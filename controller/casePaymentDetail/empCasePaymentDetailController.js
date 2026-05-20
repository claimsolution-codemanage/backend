// controllers/case-payment.controller.js
import mongoose from 'mongoose';
import CasePaymentInfo from '../../models/casePayment/casePaymentDetails.js';
import CasePaymentScheduleDetail from '../../models/casePayment/casePaymentSchedule.js';
import Case from "../../models/case/case.js";
import { generateEmiInvoice } from '../../utils/dbHelperFunc/casePayment/generateCaseInvoice.js';

// ROUND NUMBER
const round2 = (value) => {
    return Number(parseFloat(value || 0).toFixed(2));
};


// ADD MONTHS
const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
};


// CREATE CASE PAYMENT
export const createCasePayment = async (req, res) => {
    try {
        const { employee } = req
        const caseAccess = ["operation", "finance"]
        if (!caseAccess.includes(employee?.type?.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Access denied" })
        }
        const {
            caseId,
            totalProcessingFee,
            gstOption = false,
            gstPercent = 0,
            totalEmi = 1,
            advancePaid = 0,
            nextDueDate,
            paymentMode = 'UPI',
            reminderType = 'WhatsApp',
            paymentBasedOnDate = false,
            advocateMode = false,
            paymentScheduleList = [],
            remarks = '',
        } = req.body;

        if (!caseId) {
            return res.status(400).json({
                success: false,
                message: 'caseId is required',
            });
        }

        const caseData = await Case.findById(caseId).select('clientId');

        if (!caseData || !caseData.clientId) {
            return res.status(404).json({
                success: false,
                message: !caseData ? 'case not found' : 'clientId not found',
            });
        }

        const casePaymentData = await CasePaymentInfo.findOne({ caseId });
        if (casePaymentData) {
            return res.status(400).json({
                success: false,
                message: 'case payment already exists',
            });
        }

        const clientId = caseData.clientId;

        if (!totalProcessingFee) {
            return res.status(400).json({
                success: false,
                message: 'Total processing fee is required',
            });
        }

        const processingFee = round2(totalProcessingFee);

        // GST
        const gstAmount = gstOption
            ? round2((processingFee * gstPercent) / 100)
            : 0;

        // TOTAL AMOUNT
        const totalAmountWithGst = round2(
            processingFee + gstAmount
        );

        // BALANCE
        const balanceAmount = round2(
            totalAmountWithGst - (advancePaid || 0)
        );

        // EMI AMOUNT
        const emiAmount = totalEmi ? round2(balanceAmount / totalEmi) : 0;

        // PAYMENT STATUS
        let paymentStatus = 'Pending';

        if (advancePaid > 0 && balanceAmount > 0) {
            paymentStatus = 'Partial Paid';
        }

        if (balanceAmount <= 0) {
            paymentStatus = 'Paid';
        }

        const paymentDetail = await CasePaymentInfo.create({
            caseId,
            clientId,
            totalProcessingFee: processingFee,
            gstOption,
            gstPercent,
            gstAmount,
            totalAmountWithGst,
            totalEmi,
            emiAmount,
            advancePaid,
            balanceAmount,
            nextDueDate,
            paymentMode,
            reminderType,
            paymentStatus,
            paymentBasedOnDate,
            advocateMode,
            remarks,
        });

        const scheduleList = [];

        // CREATE ONLY IF BALANCE EXISTS
        if (balanceAmount > 0) {
            for (let i = 0; i < paymentScheduleList.length; i++) {
                const element = paymentScheduleList[i];
                const emiDueDate = paymentBasedOnDate ? element.dueDate : addMonths(
                    nextDueDate,
                    i
                );
                const amount = paymentBasedOnDate ? element.amount : emiAmount;
                scheduleList.push({
                    casePaymentDetailId: paymentDetail._id,
                    type: element.type || 'emi',
                    amount: amount,
                    dueDate: emiDueDate,
                    status: paymentBasedOnDate ? (element?.status || 'Pending') : 'Pending',
                });
            }

            await CasePaymentScheduleDetail.insertMany(
                scheduleList
            );
        }

        return res.status(201).json({
            success: true,
            message: 'Case payment created successfully',
            data: paymentDetail,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong!",
            error: error.message,
        });
    }
};

// GET CASE PAYMENT LIST
export const getCasePaymentList = async (req, res) => {
    try {
        const { employee } = req
        const caseAccess = ["operation", "finance"]
        if (!caseAccess.includes(employee?.type?.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Access denied" })
        }
        const { page = 1, limit = 10, search = '', paymentStatus = '', startDate = '', endDate = '' } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const matchFilter = {};

        if (paymentStatus) {
            matchFilter.paymentStatus = paymentStatus;
        }


        const searchFilter = search
            ? {
                $or: [
                    { 'clientDetails.fullName': { $regex: search, $options: 'i', } },
                    { 'clientDetails.mobileNo': { $regex: search, $options: 'i', }, },
                    { 'clientDetails.email': { $regex: search, $options: 'i', }, },
                    { 'caseDetails.policyNo': { $regex: search, $options: 'i', }, },
                    { 'caseDetails.fileNo': { $regex: search, $options: 'i', }, },
                    { 'caseDetails.insuranceCompanyName': { $regex: search, $options: 'i', }, },
                ],
            }
            : {};

        if (startDate && endDate) {
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(23, 59, 59, 999);
            matchFilter.createdAt = { $gte: new Date(start), $lte: new Date(end) }
        }

        const aggregate = [
            {
                $match: matchFilter,
            },
            {
                $lookup: {
                    from: 'cases',
                    localField: 'caseId',
                    foreignField: '_id',
                    as: 'caseDetails',
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                mobileNo: 1,
                                email: 1,
                                policyNo: 1,
                                insuranceCompanyName: 1,
                                fileNo: 1,
                                currentStatus: 1,
                                claimAmount: 1,
                                createdAt: 1,
                            }
                        }
                    ]
                },
            },
            {
                $unwind: {
                    path: '$caseDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'clientDetails',
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                email: 1,
                                mobileNo: 1,
                            }
                        }
                    ]
                },
            },
            {
                $unwind: {
                    path: '$clientDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: searchFilter,
            },
            {
                $project: {
                    _id: 1,
                    caseId: 1,
                    clientId: 1,
                    totalAmountWithGst: 1,
                    balanceAmount: 1,
                    paymentStatus: 1,
                    createdAt: 1,
                    name: '$clientDetails.fullName',
                    mobileNo: '$clientDetails.mobileNo',
                    email: '$clientDetails.email',
                    insuranceCompany: '$caseDetails.insuranceCompanyName',
                    policyNumber: '$caseDetails.policyNo',
                    fileNo: '$caseDetails.fileNo',
                    claimAmount: '$caseDetails.claimAmount',
                    currentStatus: '$caseDetails.currentStatus',
                    caseAddOn: '$caseDetails.createdAt',
                },
            },

            { $sort: { createdAt: -1, } },

            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: Number(limit), },],
                    totalCount: [{ $count: 'count', },],
                },
            },
        ];

        const result = await CasePaymentInfo.aggregate(aggregate);

        const data = result[0]?.data || [];

        const totalRecords = result[0]?.totalCount?.[0]?.count || 0;

        return res.status(200).json({
            success: true,

            pagination: {
                currentPage: Number(page),
                limit: Number(limit),
                totalRecords,
                totalPages: Math.ceil(
                    totalRecords / Number(limit)
                ),
            },

            data,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// GET CASE PAYMENT DETAILS BY ID
export const getCasePaymentById = async (req, res) => {
    try {
        const { _id } = req.params;
        const { employee } = req
        const caseAccess = ["operation", "finance"]
        if (!caseAccess.includes(employee?.type?.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Access denied" })
        }

        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment id',
            });
        }

        const result =
            await CasePaymentInfo.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(_id),
                    },
                },

                {
                    $lookup: {
                        from: 'clients',
                        localField: 'clientId',
                        foreignField: '_id',
                        as: 'clientDetails',
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    fullName: 1,
                                    mobileNo: 1,
                                    email: 1,
                                }
                            }
                        ]
                    },
                },

                {
                    $unwind: {
                        path: '$clientDetails',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'cases',
                        localField: 'caseId',
                        foreignField: '_id',
                        as: 'caseDetails',
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    insuranceCompanyName: 1,
                                    fileNo: 1,
                                    policyNo: 1,
                                    claimAmount: 1,
                                    currentStatus: 1,
                                }
                            }
                        ]
                    },
                },

                {
                    $unwind: {
                        path: '$caseDetails',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'case_payment_schedule_details',
                        localField: '_id',
                        foreignField: 'casePaymentDetailId',
                        as: 'paymentScheduleList',
                    },
                },

                {
                    $project: {
                        _id: 1,
                        caseId: 1,
                        clientId: 1,
                        totalProcessingFee: 1,
                        gstOption: 1,
                        gstPercent: 1,
                        gstAmount: 1,
                        totalAmountWithGst: 1,
                        totalEmi: 1,
                        emiAmount: 1,
                        advancePaid: 1,
                        balanceAmount: 1,
                        nextDueDate: 1,
                        paymentMode: 1,
                        reminderType: 1,
                        paymentStatus: 1,
                        paymentBasedOnDate: 1,
                        advocateMode: 1,
                        remarks: 1,
                        createdAt: 1,
                        paymentScheduleList: 1,

                        clientName: '$clientDetails.fullName',
                        mobile: '$clientDetails.mobileNo',
                        email: '$clientDetails.email',
                        insuranceCompany: '$caseDetails.insuranceCompanyName',
                        policyNumber: '$caseDetails.policyNo',
                        fileNo: '$caseDetails.fileNo',
                        totalClaimAmount: '$caseDetails.claimAmount',
                        caseStage: '$caseDetails.currentStatus',
                    },
                },
            ]);

        const paymentDetails = result[0];

        if (!paymentDetails) {
            return res.status(404).json({
                success: false,
                message: 'Case payment not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: paymentDetails,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: 'Something went wrong!',
            error: error.message,
        });
    }
};

export const payCasePaymentSchedule = async (req, res) => {
    try {
        const { employee } = req
        const caseAccess = ["operation", "finance"]
        if (!caseAccess.includes(employee?.type?.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Access denied" })
        }
        const { casePaymentDetailId, scheduleId, paymentDate, paymentMode, remarks, } = req.body;

        if (!casePaymentDetailId || !scheduleId || !paymentDate || !paymentMode) {
            return res.status(400).json({
                success: false,
                message: 'casePaymentDetailId, scheduleId, paymentDate and paymentMode are required',
            });
        }


        const paymentDetail = await CasePaymentInfo.findById(casePaymentDetailId).populate("clientId", "fullName mobileNo email profile.address profile.pinCode profile.state profile.city profile.panNo");

        if (!paymentDetail) {
            return res.status(404).json({
                success: false,
                message: 'Case payment detail not found',
            });
        }

        const schedule = await CasePaymentScheduleDetail.findOne({ _id: scheduleId, casePaymentDetailId });

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Payment schedule not found',
            });
        }

        if (schedule.status === 'Paid') {
            return res.status(400).json({
                success: false,
                message: 'This installment is already paid',
            });
        }

        schedule.status = 'Paid';
        schedule.paidDate = new Date(paymentDate);
        schedule.paymentMode = paymentMode;
        schedule.remarks = remarks || '';

        await schedule.save();

        const paidSchedules = await CasePaymentScheduleDetail.find(
            {
                casePaymentDetailId,
                status: 'Paid',
            }
        );

        const totalSchedulePaid = round2(
            paidSchedules.reduce((sum, item) => sum + item?.amount, 0)
        );

        const totalPaidAmount = round2(paymentDetail.advancePaid + totalSchedulePaid);

        const balanceAmount = round2(paymentDetail.totalAmountWithGst - totalPaidAmount);

        paymentDetail.balanceAmount = balanceAmount;

        if (balanceAmount <= 0) {
            paymentDetail.paymentStatus = 'Completed';
        } else if (
            totalPaidAmount > 0) {
            paymentDetail.paymentStatus = 'Partial Paid';
        } else {
            paymentDetail.paymentStatus = 'Pending';
        }

        await paymentDetail.save();
        // generate invoice if gst is enabled
        if (paymentDetail.gstPercent > 0 && paymentDetail.gstOption) {
            await generateEmiInvoice({
                clientId: paymentDetail.clientId,
                caseId: paymentDetail.caseId,
                amount: schedule.amount,
                gstPercent: paymentDetail.gstPercent,
                branchId: employee.branchId,
                client: {
                    name: paymentDetail.clientId?.fullName,
                    address: paymentDetail.clientId?.profile?.address || "",
                    pinCode: paymentDetail.clientId?.profile?.pinCode || "",
                    state: paymentDetail.clientId?.profile?.state || "",
                    city: paymentDetail.clientId?.profile?.city || "",
                    email: paymentDetail.clientId?.email || "",
                    mobileNo: paymentDetail.clientId?.mobileNo || "",
                    panNo: paymentDetail.clientId?.profile?.panNo || "",

                }
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Payment updated successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong!",
            error: error.message,
        });
    }
};

// UPDATE PAYMENT DETAILS
export const updateCasePaymentDetails = async (req, res) => {
    try {
        const { _id } = req.params;
        const { employee } = req
        const caseAccess = ["operation", "finance"]
        if (!caseAccess.includes(employee?.type?.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Access denied" })
        }

        const { nextDueDate, paymentMode, reminderType, paymentStatus, paymentBasedOnDate,
            advocateMode, remarks } = req.body;

        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment id',
            });
        }
        const paymentDetail = await CasePaymentInfo.findById(_id);
        if (!paymentDetail) {
            return res.status(404).json({
                success: false,
                message: 'Payment detail not found',
            });
        }

        paymentDetail.paymentMode = paymentMode || paymentDetail.paymentMode;

        paymentDetail.reminderType = reminderType || paymentDetail.reminderType;

        paymentDetail.paymentStatus = paymentStatus || paymentDetail.paymentStatus;

        paymentDetail.paymentBasedOnDate = paymentBasedOnDate || paymentDetail.paymentBasedOnDate;

        paymentDetail.advocateMode = advocateMode !== undefined ? advocateMode : paymentDetail.advocateMode;

        paymentDetail.remarks = remarks !== undefined ? remarks : paymentDetail.remarks;

        if (nextDueDate) {
            const isDueDateChange = new Date(nextDueDate).toDateString() !== new Date(paymentDetail?.nextDueDate).toDateString();
            if (isDueDateChange) {
                let bulkOps = []
                const allSchedulePayment = await CasePaymentScheduleDetail.find({ casePaymentDetailId: _id }, { dueDate: 1, status: 1 })
                for (let i = 0; i < allSchedulePayment.length; i++) {
                    const element = allSchedulePayment[i];
                    if (element?.status == "Paid") continue;
                    const emiDueDate = paymentBasedOnDate ? element.dueDate : addMonths(
                        nextDueDate,
                        i
                    );
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: element._id },
                            update: { $set: { dueDate: emiDueDate } }
                        }
                    });
                }
                if (bulkOps?.length) {
                    await CasePaymentScheduleDetail.bulkWrite(bulkOps)
                }
            }
        }

        paymentDetail.nextDueDate = nextDueDate || paymentDetail.nextDueDate;

        await paymentDetail.save();

        return res.status(200).json({
            success: true,
            message: 'Payment details updated successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong!",
            error: error.message,
        });
    }
};


// ADD NEW PAYMENT SCHEDULE
export const addPaymentSchedule = async (req, res) => {
    try {
        const { _id } = req.params;
        const { employee } = req
        const caseAccess = ["operation", "finance"]
        if (!caseAccess.includes(employee?.type?.toLowerCase())) {
            return res.status(400).json({ success: false, message: "Access denied" })
        }

        const { dueDate, amount } = req.body;

        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment id',
            });
        }

        if (!dueDate || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Due Date and amount are required',
            });
        }

        const paymentDetail = await CasePaymentInfo.findById(_id);
        if (!paymentDetail) {
            return res.status(404).json({
                success: false,
                message: 'Payment detail not found',
            });
        }


        await CasePaymentScheduleDetail.create([
            {
                casePaymentDetailId: _id,
                type: 'custom',
                amount: round2(amount),
                dueDate,
                status: 'Pending',
            },
        ]);


        const updatedBalance = Math.round(paymentDetail.balanceAmount + Number(amount));

        paymentDetail.balanceAmount = updatedBalance;
        paymentDetail.totalAmountWithGst += Math.round(Number(amount));
        paymentDetail.totalProcessingFee = Math.round((paymentDetail?.gstPercent > 0 ? round2(paymentDetail?.totalAmountWithGst / (1 + paymentDetail?.gstPercent / 100)) : paymentDetail?.totalAmountWithGst));

        await paymentDetail.save();

        return res.status(201).json({
            success: true,
            message: 'Payment added successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message,
        });
    }
};