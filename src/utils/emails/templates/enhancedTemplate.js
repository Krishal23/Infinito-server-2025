import { isIITPEmail } from "../utils.js";

export const getEnhancedOTPTemplate = (otp, type, { fullname = "User", email }) => {
  const isIITP = isIITPEmail(email);
  const color = isIITP ? "#1e3c72" : "#667eea";
  const platformName = "Infinito 2025";

  // Replace with your actual WhatsApp channel/group invite link
  const whatsappLink = "https://chat.whatsapp.com/LDLLM1odfO9Lp1VhVguluC ";

  const subject =
    type === "signup"
      ? `Welcome to ${platformName}`
      : `${platformName} - Your Verification Code`;

  const extraMessage =
    type === "signup"
      ? `
        <p><strong>Next Step:</strong> Join our official WhatsApp channel to stay updated:<br/>
        <a href="${whatsappLink}" style="color:#007bff;text-decoration:none;" target="_blank">Join WhatsApp Channel</a></p>
      `
      : "";

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; margin:0; padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;border-collapse:collapse;">
          <tr>
            <td style="padding:20px;text-align:center;background-color:#f9f9f9;">
              <h1 style="color:${color};margin:0 0 20px 0;font-size:28px;">${subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;background-color:#ffffff;">
              <p>Hello ${fullname},</p>
              <p>Your ${type} code for <strong>${platformName}</strong> is:</p>
              <p style="font-size:36px;font-weight:bold;color:${color};text-align:center;margin:20px 0;">${otp}</p>
              <p>This code expires in 10 minutes.</p>
              <p>If you did not request this code, you can safely ignore this email.</p>
              ${extraMessage}
              <p>Thank you,<br/>The ${platformName} Team</p>
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
    type === "signup"
      ? `Hello ${fullname},

Your ${type} code for ${platformName} is: ${otp}

This code expires in 10 minutes.

Next Step: Join our WhatsApp channel here: ${whatsappLink}

If you did not request this code, you can safely ignore this email.

Thank you,
The ${platformName} Team`
      : `Hello ${fullname},

Your ${type} code for ${platformName} is: ${otp}

This code expires in 10 minutes.

If you did not request this code, you can safely ignore this email.

Thank you,
The ${platformName} Team`;

  return {
    subject,
    html: htmlContent,
    text: textContent
  };
};
