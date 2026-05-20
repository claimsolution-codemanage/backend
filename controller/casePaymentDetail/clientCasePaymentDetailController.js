import mongoose from "mongoose";
import CasePaymentInfo from "../../models/casePayment/casePaymentDetails.js";

// GET CASE PAYMENT LIST
export const getCasePaymentList = async (req, res) => {
    try {
        const { client } = req
        const { page = 1, limit = 10, search = '', paymentStatus = '', startDate = '', endDate = '' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const matchFilter = { clientId: client?._id };

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
                    caseName: '$caseDetails.name',
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
                        pipeline: [
                            {
                                $project: {
                                    amount: 1,
                                    type: 1,
                                    status: 1,
                                    dueDate: 1,
                                    paymentMode: 1,
                                },
                            },
                        ],
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