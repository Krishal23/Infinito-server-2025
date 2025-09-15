import { getSenderInfo, isIITPEmail } from "../utils.js";
import { gmailTransporter, outlookTransporter } from "../transporters.js";

const getTransporter = (email) =>
  isIITPEmail(email) ? outlookTransporter : gmailTransporter;

export const sendMerchOrderEmail = async (merchOrder, user, txn) => {
  try {
    const transporter = getTransporter(user.email);
    const senderInfo = getSenderInfo(user.email, process.env);

    // Build product list
    const productList = merchOrder.products
      .map(
        (p) =>
          `<li>${p.quantity} × ${p.product} (Size: ${p.size}) - ₹${p.priceAtPurchase}</li>`
      )
      .join("");

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
      <h2>Merch Order Confirmed</h2>
      <p>Hello ${user.fullname || "Participant"},</p>
      <p>Your merch order has been successfully placed.</p>

      <h3>Shipping Details</h3>
      <p><b>Name:</b> ${merchOrder.name}</p>
      <p><b>Email:</b> ${merchOrder.email}</p>
      <p><b>Address:</b> ${merchOrder.address}, ${merchOrder.pincode}</p>
      <p><b>Phone:</b> ${merchOrder.phoneNumber}</p>
      <p><b>Delivery:</b> ${merchOrder.delivery ? "Yes" : "No"}</p>

      <h3>Products</h3>
      <ul>${productList}</ul>

      ${
        merchOrder.isCouponApplied
          ? `<p><b>Coupon Applied:</b> ${merchOrder.couponCode} (₹${merchOrder.couponDiscount} off)</p>`
          : ""
      }

      <p><b>Total Amount Paid:</b> ₹${txn.registrationFee}</p>
      <p>Payment ID: ${txn.paymentId}</p>
      <p>Order ID: ${txn.orderId}</p>
      <p>Transaction ID: ${txn._id}</p>

      <br/>
      <h3>Payment Details</h3>
      ${paymentDetails}

      <p>Thank you for ordering merch from Infinito 2025!</p>
    `;

    const info = await transporter.sendMail({
      from: `"Team Infinito 2025" <${senderInfo.address}>`,
      to: user.email,
      replyTo: "team.infinito25@gmail.com",
      subject: `Infinito 2025 - Merch Order Confirmed`,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Merch order mail error:", err);
    return { success: false, error: err.message };
  }
};
