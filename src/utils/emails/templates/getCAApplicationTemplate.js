import { isIITPEmail } from "../utils.js";

export const getCAApplicationTemplate = (status, { fullname = "User", email }) => {
  const isIITP = isIITPEmail(email);
  const color = status === "accepted" ? "#28a745" : "#dc3545";
  const platformName = "Infinito 2025";

  // Replace with your actual WhatsApp invite link
  const whatsappLink = "https://chat.whatsapp.com/LDLLM1odfO9Lp1VhVguluC ";

  const subject =
    status === "accepted"
      ? `Update: Your Campus Ambassador Application Status`
      : `Update on Your Campus Ambassador Application`;

  const message =
    status === "accepted"
      ? `
        <p>Dear ${fullname},</p>
        <p>We are pleased to inform you that your application for the <strong>Campus Ambassador (CA)</strong> role at <strong>${platformName}</strong> has been <span style="color:${color};font-weight:bold;">accepted</span>.</p>
        <p>Our team will contact you soon with the next steps and responsibilities. We look forward to your contributions.</p>
        <p><strong>Next Step:</strong> Please join our official WhatsApp channel to stay updated:<br/>
        <a href="${whatsappLink}" style="color:#007bff;text-decoration:none;" target="_blank">Join WhatsApp Channel</a></p>
      `
      : `
        <p>Dear ${fullname},</p>
        <p>Thank you for applying to the <strong>Campus Ambassador (CA)</strong> program at <strong>${platformName}</strong>. After careful review, we regret to inform you that your application has not been selected at this time.</p>
        <p>We truly appreciate your interest and encourage you to apply again in the future.</p>
      `;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;border-collapse:collapse;">
          <tr>
            <td style="padding:20px;text-align:center;background-color:#f9f9f9;">
              <h2 style="color:${color};margin:0 0 20px 0;font-size:22px;">${subject}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;background-color:#ffffff;">
              ${message}
              <p>Best regards,<br/>The ${platformName} Team</p>
              <hr style="margin:20px 0;border:none;border-top:1px solid #eee;" />
              <p style="font-size:12px;color:#888;text-align:center;">
                You are receiving this email because you applied for the CA program at ${platformName}.  
                If this wasn’t you, please ignore this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px;text-align:center;font-size:12px;color:#888;background-color:#f9f9f9;">
              &copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent =
    status === "accepted"
      ? `Dear ${fullname},\n\nWe are pleased to inform you that your application for Campus Ambassador (CA) at ${platformName} has been accepted.\n\nOur team will contact you soon with the next steps.\n\nNext Step: Please join our official WhatsApp channel here: ${whatsappLink}\n\nBest regards,\nThe ${platformName} Team`
      : `Dear ${fullname},\n\nThank you for applying to the Campus Ambassador (CA) program at ${platformName}. Unfortunately, your application was not selected at this time.\n\nWe encourage you to apply again in the future.\n\nBest regards,\nThe ${platformName} Team`;

  return {
    subject,
    html: htmlContent,
    text: textContent,
  };
};
