import axios from "axios";

const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

export const sendOTPMsg = async ({ mobile, otp }) => {
  try {
    const response = await axios.post(
      "https://control.msg91.com/api/v5/otp",
      {OTP: otp},
      {
        params: {
          template_id: TEMPLATE_ID,
          mobile,
          authkey: AUTH_KEY,
        },
        headers: { "Content-Type": "application/json",},
      }
    );

    return response.data;
  } catch (error) {
    console.error("MSG91 Error:", error.response?.data || error.message );

    throw new Error(error.response?.data?.message || "Failed to send OTP");
  }
};