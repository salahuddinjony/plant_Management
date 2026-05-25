import status from "http-status";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import config from "../config";
import AppError from "../errors/AppError";
import { isSendGridConfigured, sendViaSendGrid } from "./sendgridEmail";

const CONNECTION_TIMEOUT_MS = 20_000;

const normalizeSmtpPassword = (password?: string) =>
    password?.replace(/\s+/g, "").trim() || "";

type SmtpProfile = {
    label: string;
    port: number;
    secure: boolean;
};

const GMAIL_SMTP_PROFILES: SmtpProfile[] = [
    { label: "587-STARTTLS", port: 587, secure: false },
    { label: "465-SSL", port: 465, secure: true },
];

const buildTransportOptions = (profile: SmtpProfile): SMTPTransport.Options => ({
    host: config.smtpHost,
    port: profile.port,
    secure: profile.secure,
    requireTLS: profile.port === 587,
    auth: {
        user: config.smtpUserName,
        pass: normalizeSmtpPassword(config.smtpPassword),
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: CONNECTION_TIMEOUT_MS,
    tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
    },
});

const getSmtpProfiles = (): SmtpProfile[] => {
    if (config.smtpPort) {
        const port = config.smtpPort;
        const secure =
            config.smtpSecure !== undefined ? config.smtpSecure : port === 465;
        return [{ label: `custom-${port}`, port, secure }];
    }
    return GMAIL_SMTP_PROFILES;
};

let activeTransporter: nodemailer.Transporter | null = null;

const createTransporter = (profile: SmtpProfile) =>
    nodemailer.createTransport(buildTransportOptions(profile));

const isConnectionError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const code = (error as NodeJS.ErrnoException).code;
    const msg = error.message.toLowerCase();
    return (
        code === "ETIMEDOUT" ||
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "ESOCKET" ||
        msg.includes("timeout") ||
        msg.includes("connect")
    );
};

const getWorkingTransporter = async (): Promise<nodemailer.Transporter> => {
    if (!config.smtpUserName || !config.smtpPassword) {
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "Email service is not configured (SMTP_USERNAME / SMTP_PASSWORD missing)"
        );
    }

    if (activeTransporter) {
        return activeTransporter;
    }

    const profiles = getSmtpProfiles();
    const errors: string[] = [];

    for (const profile of profiles) {
        const transport = createTransporter(profile);
        try {
            await transport.verify();
            activeTransporter = transport;
            console.info(`SMTP ready (${config.smtpHost}:${profile.port}, ${profile.label})`);
            return transport;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${profile.label}: ${message}`);
            if (!isConnectionError(error)) {
                throw new AppError(
                    status.INTERNAL_SERVER_ERROR,
                    `SMTP authentication failed. ${message}`
                );
            }
        }
    }

    console.error("SMTP verification failed:", errors.join(" | "));
    throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Cannot reach mail server (${config.smtpHost}). Use SENDGRID_API_KEY on VPS, or check SMTP firewall settings.`
    );
};

const resetTransporter = () => {
    activeTransporter = null;
};

const sendWithSmtp = async (mailOptions: nodemailer.SendMailOptions): Promise<void> => {
    const transport = await getWorkingTransporter();
    const fromEmail = config.sendGridFromEmail || config.smtpUserName;
    try {
        await transport.sendMail({
            ...mailOptions,
            from: mailOptions.from ?? `"${config.sendGridFromName}" <${fromEmail}>`,
        });
    } catch (error) {
        if (isConnectionError(error)) {
            resetTransporter();
            const retryTransport = await getWorkingTransporter();
            await retryTransport.sendMail({
                ...mailOptions,
                from: mailOptions.from ?? `"${config.sendGridFromName}" <${fromEmail}>`,
            });
            return;
        }
        throw error;
    }
};

/** Send via SendGrid API (HTTPS) when configured; otherwise SMTP fallback. */
const dispatchEmail = async ({
    to,
    subject,
    html,
    text,
}: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}) => {
    if (isSendGridConfigured()) {
        return sendViaSendGrid({ to, subject, html, text });
    }
    await sendWithSmtp({
        to,
        subject,
        html,
        text: text ?? subject,
    });
    return { email: to, provider: "smtp" as const };
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
    try {
        const htmlContent = generateEmailTemplate({
            username: username || email.split("@")[0],
            otp: token,
            verificationLink,
            title,
            intro,
        });

        await dispatchEmail({
            to: email,
            subject,
            html: htmlContent,
            text: `Your verification code is: ${token}`,
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
    try {
        await dispatchEmail({
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
