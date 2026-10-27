import { BrevoClient } from "@getbrevo/brevo";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env file
dotenv.config({
    path: path.resolve(__dirname, "../.env"),
});

const getClient = () => {
    const apiKey = process.env.BREVO_API_KEY;

    if (
        !apiKey ||
        apiKey === "your_brevo_api_key_here"
    ) {
        throw new Error(
            "BREVO_API_KEY is missing. Check your backend .env file."
        );
    }

    return new BrevoClient({ apiKey });
};

// ==========================================
// SEND EMAIL
// ==========================================
export const sendEmail = async ({
    toEmail,
    toName,
    subject,
    htmlContent,
}) => {
    try {
        if (
            !process.env.BREVO_SENDER_EMAIL ||
            !process.env.BREVO_SENDER_NAME
        ) {
            throw new Error(
                "BREVO_SENDER_EMAIL or BREVO_SENDER_NAME is missing in .env"
            );
        }

        const client = getClient();

        const payload = {
            subject,
            htmlContent,
            sender: {
                name: process.env.BREVO_SENDER_NAME,
                email: process.env.BREVO_SENDER_EMAIL,
            },
            to: [
                {
                    email: toEmail,
                    name: toName || toEmail,
                },
            ],
        };

        const response =
            await client.transactionalEmails.sendTransacEmail(
                payload
            );

        console.log(
            "Brevo email sent successfully:",
            response?.messageId || "Request accepted"
        );

        return response;
    } catch (error) {
        console.error(
            "Brevo Email Error:",
            error?.message || error
        );

        // Propagate the error so callers can handle delivery failures.
        throw error;
    }
};

// ==========================================
// WELCOME EMAIL
// ==========================================
export const sendWelcomeEmail = async (email, name) => {
    const safeName = escapeHtml(name || "Learner");

    const html = `
        <div style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#4F46E5;">
                Welcome to AI Learning Management System, ${safeName}!
            </h2>
            <p>Thank you for registering with our learning platform.</p>
            <p>You can now log in, explore courses, and track your learning progress.</p>
            <p style="color:#666;font-size:14px;">
                Best regards,<br/>
                <strong>AI Learning Management System</strong>
            </p>
        </div>
    `;

    return sendEmail({
        toEmail: email,
        toName: name,
        subject: "Welcome to AI Learning Management System!",
        htmlContent: html,
    });
};

// ==========================================
// EMAIL VERIFICATION OTP
// ==========================================
export const sendOtpEmail = async (email, otp) => {
    const html = `
        <div style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#4F46E5;">Email Verification</h2>
            <p>Use this OTP to verify your email address:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#111;padding:16px;text-align:center;background:#F3F4F6;border-radius:6px;">
                ${escapeHtml(otp)}
            </div>
            <p style="color:#666;font-size:14px;">
                This OTP expires in 10 minutes. If you did not request it, ignore this email.
            </p>
        </div>
    `;

    return sendEmail({
        toEmail: email,
        subject: "Your Verification OTP",
        htmlContent: html,
    });
};

// ==========================================
// FORGOT PASSWORD OTP
// ==========================================
export const sendForgotPasswordEmail = async (email, otp) => {
    const html = `
        <div style="font-family:Arial,sans-serif;padding:24px;color:#333;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;">
            <h2 style="color:#DC2626;">Password Reset OTP</h2>
            <p>Use the OTP below to reset your password:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#DC2626;padding:16px;text-align:center;background:#FEF2F2;border-radius:6px;">
                ${escapeHtml(otp)}
            </div>
            <p style="color:#666;font-size:14px;">
                This OTP expires in 10 minutes. If you did not request a reset, ignore this email.
            </p>
        </div>
    `;

    return sendEmail({
        toEmail: email,
        subject: "Password Reset Request OTP",
        htmlContent: html,
    });
};

// ==========================================
// HTML ESCAPE HELPER
// ==========================================
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
