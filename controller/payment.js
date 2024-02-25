
export const paymentWebHook = async (req, res) => {
    try {
        console.log("paymentWebHook",req);
       return res.status(200).json({ success: true, message: "payment"});
    } catch (error) {
       console.log("paymentWebHook in error:", error);
       res.status(500).json({ success: false, message: "Internal server error", error: error });
 
    }
 }