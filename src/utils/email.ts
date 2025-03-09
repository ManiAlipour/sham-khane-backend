import nodemailer from "nodemailer";

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

const createTransporter = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify the connection
    await transporter.verify();
    console.log("Email server connection verified");
    return transporter;
  } catch (error) {
    console.error("Email configuration error:", error);
    throw new Error("Failed to create email transporter");
  }
};

const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = await createTransporter();

    const message = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message,
    };

    const info = await transporter.sendMail(message);
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Email could not be sent"
    );
  }
};

export default sendEmail;
