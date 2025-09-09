import { buildPlayerTxt } from "../playerTxt.js";
import { getSenderInfo, isIITPEmail } from "../utils.js";
import { gmailTransporter } from "../transporters.js";

const getTransporter = (email) =>
  isIITPEmail(email) ? outlookTransporter : gmailTransporter;

export const sendEventRegistrationEmail = async (
  registrationData,
  eventKey,
  razorpay_payment_id,
  razorpay_order_id,
  txn
) => {
  try {
    const transporter = getTransporter(registrationData.email);
    const senderInfo = getSenderInfo(registrationData.email, process.env);
    const whatsappLink= "https://chat.whatsapp.com/DfYJOiHIHdIDSvKgDJkcKP?mode=ems_copy_c"

    const playerTxt = buildPlayerTxt(registrationData, eventKey);

    let paymentDetails = `<p><b>Payment Method:</b> ${txn.method || "N/A"}</p>`;

    if (txn.method === "upi") {
      paymentDetails += `<p><b>UPI ID:</b> ${txn.upiVpa || "N/A"}</p>`;
      paymentDetails += `<p><b>UPI Transaction ID:</b> ${txn.upiTransactionId || "N/A"}</p>`;
    }

    if (txn.method === "wallet") {
      paymentDetails += `<p><b>Wallet:</b> ${txn.wallet || "N/A"}</p>`;
    }

    if (txn.method === "card" && txn.card) {
      paymentDetails += `<p><b>Card:</b> **** **** **** ${txn.card.last4}</p>`;
      paymentDetails += `<p><b>Issuer:</b> ${txn.card.issuer || "N/A"}</p>`;
      paymentDetails += `<p><b>Network:</b> ${txn.card.network || "N/A"}</p>`;
      paymentDetails += `<p><b>Type:</b> ${txn.card.type || "N/A"}</p>`;
    }

    const html = `
      <h2>Registration Successful</h2>
      <p>Hello ${registrationData.fullname || "Participant"},</p>
      <p>Your registration for <strong>${eventKey.toUpperCase()}</strong> has been confirmed.</p>
      <p><b>Category:</b> ${registrationData?.category || "open"}</p>
      <p><b>Amount Paid:</b> ₹${registrationData.registrationFee || registrationData.amount}</p>
      <p>Payment ID: ${razorpay_payment_id}</p>
      <p>Order ID: ${razorpay_order_id}</p>
      <p>Transaction ID: ${txn._id}</p>
      <br/>
      <h3>Payment Details</h3>
      ${paymentDetails}
      <br/>
      <p>Thank you for registering. We’ll see you at Infinito 2025!</p>
      <p><strong>Next Step:</strong> Please join our official WhatsApp channel to stay updated:<br/>
        <a href="${whatsappLink}" style="color:#007bff;text-decoration:none;" target="_blank">Join WhatsApp Channel</a></p>
    `;

    const info = await gmailTransporter.sendMail({
      from: `"Team Infinito 2025" <${senderInfo.address}>`,
      to: registrationData.email,
      replyTo: "team.infinito25@gmail.com",
      subject: `Infinito 2025 - ${eventKey} Registration Confirmed`,
      html,
      attachments: [
        {
          filename: `${eventKey}_players.txt`,
          content: playerTxt,
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Event mail error:", err);
    return { success: false, error: err.message };
  }
};
