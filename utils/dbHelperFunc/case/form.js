import CaseFormModal, { FORM_TYPE_OPTIONS } from "../../../models/caseForm/caseForm.js";
import CaseFormSectionModal from "../../../models/caseForm/caseFormSection.js";
import CaseFormAttachmentModal from "../../../models/caseForm/caseFormAttachment.js";
import Case from "../../../models/case/case.js";
import Client from "../../../models/client.js";
import CasePaymentDetails from "../../../models/casePaymentDetails.js"
import Statement from "../../../models/statement.js"
import Bill from "../../../models/bill.js"
import { isValidMongoId } from "../../utilityFunc.js";
import mongoose from "mongoose";
import { accountTermConditionTemplate } from "../../emailTemplates/accountTermConditionTemplate.js";
import { sendMail } from "../../sendMail.js";
import { editServiceAgreement } from "../../createPdf/serviceAgreement.js";
import { dateOptions } from "../../helper.js";
import { revisedAgreementTemplate } from "../../emailTemplates/revisedServiceAgreement.js";


const senderDetails = {
    name: "ADAKIYA CONSULTANCY SERVICES PVT.LTD",
    address: "A-4 & 5, 3rd Floor, Rajupark, Devli Road, Near Domino's Pizza, New Delhi -110080,India",
    state: "Delhi",
    country: "IN",
    pinCode: "110062",
    gstNo: "07AAYCA7531P1ZR",
    panNo: "AAYCA7531P",
    email: "claimsolution.in@gmail.com",
    mobileNo: "011 49858616"
}

const generateReceiverDetails = (findClient) => {
    return {
        name: findClient?.profile?.consultantName || "",
        address: findClient?.profile?.address || "",
        state: findClient?.profile.state || "",
        country: "IN",
        pinCode: findClient?.profile?.pinCode || "",
        gstNo: "",
        panNo: findClient?.profile?.panNo || "",
        email: findClient?.profile?.primaryEmail || "",
        mobileNo: findClient?.profile?.primaryMobileNo || "",
    }
}

const sendServiceAgreement = async ({ payload }) => {
    const { mailTo, as, fullName, replacements = {}, claimType } = payload
    let filePath = as == "Client" ? "agreement/client.pdf" : "agreement/partner.pdf"
    try {
        const modifiedPdfBytes = await editServiceAgreement(filePath, replacements);
        await sendMail({
            subject: `${as} Service Agreement`,
            to: mailTo,
            html: revisedAgreementTemplate({ as, name: fullName, claimType }),
            attachments: [{
                filename: 'revised_service_agreement.pdf',
                content: modifiedPdfBytes,
                encoding: 'base64'
            }]
        });
    } catch (error) {
        console.log("sendServiceAgreement", error);

    }
}

// helpers/caseFinance.js
// 🔸 Utility: assign allowed fields
const assignAllowedFields = (target, source, allowedKeys) => {
    allowedKeys.forEach(key => {
        if (source[key] !== undefined && source[key] !== null) {
            target[key] = source[key];
        }
    });
};

// 🔸 Utility: fetch or create doc
const getOrCreate = async (Model, query, defaults = {}) => {
    let doc = await Model.findOne(query);
    if (!doc) {
        doc = new Model(defaults);
    }
    return doc;
};

// 🔸 Main function
export const handleCaseFinance = async ({
    caseForm,
    findCase,
    req,
    findClient,
}) => {
    if (!caseForm || !findCase) return caseForm;
    const { partnerFee, consultantFee, approved, approvedAmount, } = req.body
    const today = new Date()?.toLocaleString('en-US', dateOptions)?.split("GMT")?.[0]

    const receiverDetails = generateReceiverDetails(findClient)

    // 1️⃣ Settlement → Payment + Statement
    if (req.body?.isSettelment) {
        let paymentDetails = await getOrCreate(
            CasePaymentDetails,
            { _id: caseForm?.paymentDetailsId, isActive: true },
            { caseId: findCase?._id, isActive: true, branchId: findCase?.branchId || "" }
        );

        const approvedAmt = req?.body?.amount ? Number(req.body.amount) : 0;

        assignAllowedFields(paymentDetails, req.body, [
            "paymentMode", "dateOfPayment", "utrNumber",
            "bankName", "chequeNumber", "chequeDate",
            "amount", "transactionDate"
        ]);
        await paymentDetails.save();

        caseForm.paymentDetailsId = paymentDetails._id;

        // Statement
        if (findCase?.partnerObjId?._id && partnerFee) {
            let statement = await getOrCreate(
                Statement,
                { _id: caseForm?.statementId, isActive: true },
                { partnerId: findCase?.partnerObjId?._id, isActive: true, branchId: findCase?.branchId }
            );

            const payAmt = (approvedAmt * Number(partnerFee)) / 100;
            const statementDefaults = {
                caseLogin: findCase?.createdAt,
                policyHolder: findCase?.name,
                fileNo: findCase?.fileNo,
                policyNo: findCase?.policyNo,
                insuranceCompanyName: findCase?.insuranceCompanyName,
                claimAmount: findCase?.claimAmount,
                approvedAmt,
                constultancyFee: payAmt,
                TDS: 0,
                modeOfLogin: "Online",
                payableAmt: payAmt,
                utrDetails: "",
            };

            assignAllowedFields(statement, statementDefaults, Object.keys(statementDefaults));
            await statement.save();

            caseForm.statementId = statement._id;
            sendServiceAgreement({
                payload: {
                    mailTo: findCase?.partnerObjId?.profile?.primaryEmail,
                    as: "Partner",
                    fullName: findCase?.partnerObjId?.profile?.consultantName,
                    replacements: { service_commission: `${partnerFee ?? 6}%`, signed_on: today },
                    claimType: FORM_TYPE_OPTIONS[caseForm?.formType]
                }
            })
        }
    }

    // 2️⃣ Bill
    if (approved) {
        const billCount = await Bill.countDocuments({});
        let bill = await getOrCreate(
            Bill,
            { _id: caseForm?.billId, isActive: true },
            {
                invoiceNo: `ACS-${billCount + 1}`,
                caseId: caseForm._id,
                clientId: findCase?.clientId,
                branchId: findCase?.branchId || "",
                billDate: new Date(),
            }
        );

        if (!bill.isPaid) {
            const gstRate = 18;
            const totalAmt = (Number(approvedAmount || 0) * Number(consultantFee || 0)) / 100;
            const gstAmt = (totalAmt * gstRate) / 100 || 0;
            const subAmt = totalAmt - gstAmt;

            bill.sender = senderDetails;
            bill.receiver = receiverDetails;
            bill.invoiceItems = {
                name: "fee",
                description: "consultant fee",
                quantity: 0,
                gstRate,
                rate: 0,
                gstAmt,
                amt: subAmt,
                totalAmt,
            };
            bill.subAmt = subAmt;
            bill.gstAmt = gstAmt;
            bill.totalAmt = totalAmt;

            await bill.save();
        }

        caseForm.billId = bill._id;
        sendServiceAgreement({
            payload: {
                mailTo: findCase?.clientObjId?.profile?.primaryEmail,
                as: "Client",
                fullName: findCase?.clientObjId?.profile?.consultantName,
                replacements: {commission: `${consultantFee ?? 20}%`, signed_on: today },
                claimType: FORM_TYPE_OPTIONS[caseForm?.formType]
            }
        })
    }

    await caseForm.save();
    return caseForm;
};

export const createOrUpdateCaseForm = async (req, res, next) => {
    try {
        const { caseId, formType, sections = [] } = req.body;
        if (!caseId) return res.status(400).json({ success: false, message: "Case ID is required" })
        if (!formType) return res.status(400).json({ success: false, message: "Form type is required" })
        const caseFormId = req.body?._id
        const findCase = await Case.findOne({ _id: caseId, isActive: true })
            .populate("partnerObjId", "profile.primaryEmail profile.consultantName")
            .populate("clientObjId", "profile branchId")
        if (!findCase) return res.status(400).json({ status: 0, message: "Case not found" });
        const findClient = findCase?.clientObjId
        console.log("clientobjid", findCase?.clientObjId);
        console.log("partnerObjId", findCase?.partnerObjId);



        // const findClient = await Client.findOne({ _id: findCase.clientObjId }).select("fullName profile")

        if (!findClient) return res.status(400).json({ status: 0, message: "Client not found" });

        // ✅ CaseForm: update or create
        let caseForm;
        if (caseFormId) {
            caseForm = await CaseFormModal.findOne({ _id: caseFormId, caseId, isActive: true });
            if (!caseForm) return res.status(400).json({ status: 0, message: "CaseForm not found" });
        } else {
            caseForm = new CaseFormModal({
                caseId,
                clientId: findCase.clientId,
                branchId: findCase.branchId || "",
                formType
            });
        }

        // 🔹 Update allowed fields on CaseForm
        const caseFormFields = [
            "partnerFee", "consultantFee", "filingDate", "isSettelment",
            "approved", "approvedAmount", "approvalDate",
            "approvalLetter", "approvalLetterPrivate", "specialCase"
        ];
        caseFormFields.forEach(field => {
            if (req.body[field] !== undefined) caseForm[field] = req.body[field];
        });
        await caseForm.save();

        // ✅ Keep track of sections & attachments from frontend
        const frontendSectionIds = sections.filter(s => s._id).map(s => s._id);
        const frontendAttachmentIds = sections.flatMap(s =>
            (s.attachments || []).filter(a => a._id).map(a => a._id)
        );

        // 🔹 Delete sections removed on frontend
        await CaseFormSectionModal.deleteMany({
            caseFormId: caseForm._id,
            _id: { $nin: frontendSectionIds }
        });

        // 🔹 Delete attachments removed on frontend
        await CaseFormAttachmentModal.deleteMany({
            caseFormId: caseForm._id,
            _id: { $nin: frontendAttachmentIds }
        });

        // ✅ Handle Sections
        for (const sec of sections) {
            let sectionDoc;
            if (sec._id) {
                sectionDoc = await CaseFormSectionModal.findById(sec._id);
                if (!sectionDoc) continue;
            } else {
                sectionDoc = new CaseFormSectionModal({
                    caseFormId: caseForm._id,
                    type: sec.type
                });
            }

            // Update section fields
            const sectionFields = ["status", "remarks", "date", "isPrivate", "deliveredBy", "awardType"];
            sectionFields.forEach(field => {
                if (sec[field] !== undefined) sectionDoc[field] = sec[field];
            });
            await sectionDoc.save();

            // ✅ Handle Attachments inside section
            if (Array.isArray(sec.attachments)) {
                for (const att of sec.attachments) {
                    let attDoc;
                    if (att._id) {
                        attDoc = await CaseFormAttachmentModal.findById(att._id);
                        if (!attDoc) continue;
                    } else {
                        attDoc = new CaseFormAttachmentModal({
                            caseFormId: caseForm._id,
                            caseFormSectionId: sectionDoc._id
                        });
                    }
                    const attFields = ["url", "fileName", "fileType"];
                    attFields.forEach(field => {
                        if (att[field] !== undefined) attDoc[field] = att[field];
                    });
                    await attDoc.save();
                }
            }
        }

        await handleCaseFinance({ caseForm, findCase, req, findClient })

        return res.status(200).json({
            status: 1,
            message: "CaseForm saved successfully",
            caseFormId: caseForm._id
        });

    } catch (error) {
        console.log("createOrUpdateCaseForm error", error);
        return res.status(500).json({ status: 0, message: "Something went wrong" });
    }
};

export const getCaseFormDetailsById = async (req, res, next) => {
    try {
        const { isPrivate, isClient } = req
        const { formId, caseId } = req.params;

        if (!isValidMongoId(formId) || !isValidMongoId(caseId)) {
            return res.status(400).json({ success: false, message: "Invalid form ID/ case ID" });
        }
        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(formId),
                    caseId: new mongoose.Types.ObjectId(caseId),
                }
            },
            ...(!isClient ? [{
                $lookup: {
                    from: "case_form_sections",
                    localField: "_id",
                    foreignField: "caseFormId",
                    as: "sections",
                    pipeline: [
                        {
                            $match: {
                                isActive: true,
                                ...(!isPrivate ? { isPrivate: false } : {})
                            }
                        },
                        {
                            $lookup: {
                                from: "case_form_attachements",
                                localField: "_id",
                                foreignField: "caseFormSectionId",
                                as: "attachments",
                                pipeline: [
                                    {
                                        $match: {
                                            isActive: true,
                                            ...(!isPrivate ? { isPrivate: false } : {})
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "casepaymentdetails",
                    localField: "paymentDetailsId",
                    foreignField: "_id",
                    as: "paymentDetailsId",
                    pipeline: [
                        {
                            $match: {
                                isActive: true
                            }
                        },
                    ]
                }
            },
            {
                $unwind: {
                    path: "$paymentDetailsId",
                    preserveNullAndEmptyArrays: true
                }
            }] : []),

            ...(isClient ? [{
                $project: {
                    specialCase: 0,
                    partnerFee: 0,
                    consultantFee: 0,
                    method: 0,
                }
            }] : [])
        ]
        let [formDetail] = await CaseFormModal.aggregate(pipeline)
        if (!formDetail) {
            return res.status(404).json({ success: false, message: "Form not found" });
        }

        if (formDetail && formDetail?.approvalLetterPrivate && !isPrivate) {
            delete formDetail.approvalLetter
        }

        res.status(200).json({
            success: 1,
            message: "Case form fetched successfully",
            data: formDetail,
        });
    } catch (error) {
        console.log("getCaseFormDetailsById error", error);
        return res.status(500).json({ status: 0, message: "Something went wrong" });
    }
}