import status from "http-status";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import config from "../config";
import AppError from "../errors/AppError";

const normalizeSmtpPassword = (password?: string) =>
    password?.replace(/\s+/g, "").trim() || "";

const buildTransportOptions = (): SMTPTransport.Options => {
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure =
        process.env.SMTP_SECURE !== undefined
            ? process.env.SMTP_SECURE === "true"
            : port === 465;

    return {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port,
        secure,
        auth: {
            user: config.smtpUserName,
            pass: normalizeSmtpPassword(config.smtpPassword),
        },
    };
};

let transporter = nodemailer.createTransport(buildTransportOptions());

const ensureMailerReady = async () => {
    if (!config.smtpUserName || !config.smtpPassword) {
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "Email service is not configured (SMTP_USERNAME / SMTP_PASSWORD missing)"
        );
    }

    try {
        await transporter.verify();
    } catch (error) {
        transporter = nodemailer.createTransport(buildTransportOptions());
        try {
            await transporter.verify();
        } catch (retryError) {
            const message =
                retryError instanceof Error ? retryError.message : "SMTP verify failed";
            console.error("SMTP verification failed:", message);
            throw new AppError(
                status.INTERNAL_SERVER_ERROR,
                `Failed to send email. Check SMTP app password (no spaces) and Gmail settings. ${message}`
            );
        }
    }
};

const generateEmailTemplate = ({
    username,
    otp,
    verificationLink,
    title = "Email Verification",
    intro = "Please use the following verification code:",
}: {
    username: string;
    otp: string;
    verificationLink?: string;
    title?: string;
    intro?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#fff;border-radius:10px;padding:40px;">
            <h1 style="color:#333;font-size:24px;">${title}</h1>
            <p style="color:#666;">Hello ${username},</p>
            <p style="color:#666;">${intro}</p>
            <div style="background:#f8f9fa;border:2px dashed #dee2e6;border-radius:8px;padding:15px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:4px;color:#333;margin:20px 0;">
                ${otp}
            </div>
            <p style="color:#666;">This code expires in 5 minutes.</p>
            ${
                verificationLink
                    ? `<p style="text-align:center;"><a href="${verificationLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>`
                    : ""
            }
            <p style="color:#999;font-size:13px;">If you did not request this, ignore this email.</p>
        </div>
    </div>
</body>
</html>
`;

export const sendEmail = async ({
    email,
    token,
    username,
    verificationLink,
    subject = "Verify Your Email - Nursery Bazar BD",
    title,
    intro,
}: {
    email: string;
    token: string;
    username?: string;
    verificationLink?: string;
    subject?: string;
    title?: string;
    intro?: string;
}) => {
    await ensureMailerReady();

    try {
        const htmlContent = generateEmailTemplate({
            username: username || email.split("@")[0],
            otp: token,
            verificationLink,
            title,
            intro,
        });

        await transporter.sendMail({
            from: `"Nursery Bazar BD" <${config.smtpUserName}>`,
            to: email,
            subject,
            text: `Your verification code is: ${token}`,
            html: htmlContent,
        });

        return { email };
    } catch (emailError) {
        const message =
            emailError instanceof Error ? emailError.message : "Unknown email error";
        console.error("Failed to send email:", message);
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            `Failed to send email. ${message}`
        );
    }
};

export const sendHtmlEmail = async ({
    email,
    subject,
    html,
    text,
}: {
    email: string;
    subject: string;
    html: string;
    text?: string;
}) => {
    await ensureMailerReady();

    try {
        await transporter.sendMail({
            from: `"Nursery Bazar BD" <${config.smtpUserName}>`,
            to: email,
            subject,
            html,
            text: text ?? subject,
        });
        return { email };
    } catch (emailError) {
        const message =
            emailError instanceof Error ? emailError.message : "Unknown email error";
        console.error("Failed to send email:", message);
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            `Failed to send email. ${message}`
        );
    }
};
