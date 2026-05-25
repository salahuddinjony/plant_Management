import sgMail from "@sendgrid/mail";
import status from "http-status";
import config from "../config";
import AppError from "../errors/AppError";

export const isSendGridConfigured = (): boolean => Boolean(config.sendGridApiKey?.trim());

const getFrom = () => {
    const email = config.sendGridFromEmail?.trim() || config.smtpUserName?.trim();
    if (!email) {
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "Email sender is not configured (SENDGRID_FROM_EMAIL or SMTP_USERNAME)"
        );
    }
    return {
        email,
        name: config.sendGridFromName?.trim() || "Nursery Bazar BD",
    };
};

let apiKeyInitialized = false;

const ensureSendGrid = () => {
    const apiKey = config.sendGridApiKey?.trim();
    if (!apiKey) {
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "SendGrid is not configured (SENDGRID_API_KEY missing)"
        );
    }
    if (!apiKeyInitialized) {
        sgMail.setApiKey(apiKey);
        apiKeyInitialized = true;
    }
};

export const sendViaSendGrid = async ({
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
    ensureSendGrid();

    const from = getFrom();

    try {
        await sgMail.send({
            to: to.trim(),
            from,
            subject,
            html,
            text: text ?? subject,
        });
        return { email: to, provider: "sendgrid" as const };
    } catch (error: unknown) {
        const sgBody =
            error &&
            typeof error === "object" &&
            "response" in error &&
            (error as { response?: { body?: unknown } }).response?.body;
        if (sgBody) {
            console.error("SendGrid API error:", JSON.stringify(sgBody));
        }
        const message = error instanceof Error ? error.message : "Unknown SendGrid error";
        console.error("SendGrid send failed:", message);
        throw new AppError(status.INTERNAL_SERVER_ERROR, `Failed to send email via SendGrid. ${message}`);
    }
};
