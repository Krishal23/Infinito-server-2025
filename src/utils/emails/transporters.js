import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();



export const gmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
  family: 4, // force IPv4
});


export const outlookTransporter = nodemailer.createTransport({
  service: "outlook",
  auth: {
    user: process.env.OUTLOOK_USERNAME,
    pass: process.env.OUTLOOK_PASSWORD
  }
});

export const verifyTransporters = () => {
  gmailTransporter.verify((err) =>
    console.log(err ? "Gmail transporter failed:" + err.message : "Gmail ready")
  );
  outlookTransporter.verify((err) =>
    console.log(err ? "Outlook transporter failed:" + err.message : "Outlook ready")
  );
};
