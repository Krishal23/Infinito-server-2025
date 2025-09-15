import { getSenderInfo, isIITPEmail } from "../utils.js";
import { gmailTransporter, outlookTransporter } from "../transporters.js";

const getTransporter = (email) =>
  isIITPEmail(email) ? outlookTransporter : gmailTransporter;

export const sendAccommodationBookingEmail = async (
  accommodation,
  user,
  payment,
  txn
) => {
  try {
    const transporter = getTransporter(user.email);
    const senderInfo = getSenderInfo(user.email, process.env);

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
      <h2>Accommodation Booking Confirmed</h2>
      <p>Hello ${user.fullname || "Participant"},</p>
      <p>Your accommodation for <strong>Infinito 2025</strong> has been successfully booked.</p>

      <h3>Booking Details</h3>
      <p><b>Check-in:</b> ${new Date(accommodation.checkInDate).toDateString()}</p>
      <p><b>Check-out:</b> ${new Date(accommodation.checkOutDate).toDateString()}</p>
      <p><b>Number of Players:</b> ${accommodation.players?.length || 0}</p>
      <p><b>Gender Category:</b> ${accommodation.genderCategory}</p>
      ${
        accommodation.couponCode
          ? `<p><b>Coupon Applied:</b> ${accommodation.couponCode} (₹${accommodation.couponDiscount} off)</p>`
          : ""
      }
      <p><b>Total Amount Paid:</b> ₹${txn.registrationFee}</p>
      <p>Payment ID: ${payment.id}</p>
      <p>Order ID: ${payment.order_id}</p>
      <p>Transaction ID: ${txn._id}</p>
      <br/>
      <h3>Payment Details</h3>
      ${paymentDetails}
      <br/>
      <p>Thank you for booking your stay. We look forward to welcoming you at Infinito 2025!</p>
    `;

    const info = await transporter.sendMail({
      from: `"Team Infinito 2025" <${senderInfo.address}>`,
      to: user.email,
      replyTo: "team.infinito25@gmail.com",
      subject: `Infinito 2025 - Accommodation Booking Confirmed`,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Accommodation mail error:", err);
    return { success: false, error: err.message };
  }
};
