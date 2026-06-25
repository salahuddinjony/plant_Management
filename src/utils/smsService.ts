import status from "http-status";
import config from "../config";
import AppError from "../errors/AppError";

type MimSmsResponse = {
    status?: string;
    statusCode?: number;
    message?: string;
    data?: unknown;
};

/** MiM SMS API V2 — used for OTP, staff invites, order delivered, etc. */
export const sendMimSms = async (mobileNumber: string, message: string) => {
    if (!config.smsApiKey || !config.smsUserName || !config.smsSenderName) {
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "SMS provider is not configured (SMS_API_KEY, SMS_USER_NAME, SMS_SENDER_NAME)"
        );
    }

    const body = {
        apiKey: config.smsApiKey,
        userName: config.smsUserName,
        senderName: config.smsSenderName,
        transactionType: "T",
        mobileNumber,
        message,
        campaignName: config.smsCampaignName,
    };

    const response = await fetch(config.mimSmsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    let payload: MimSmsResponse | string = "";
    try {
        payload = (await response.json()) as MimSmsResponse;
    } catch {
        payload = await response.text();
    }

    const responseMessage =
        typeof payload === "object" && payload !== null
            ? String(payload.message ?? payload.status ?? "")
            : String(payload);

    const isSuccess =
        response.ok &&
        (typeof payload !== "object" ||
            payload === null ||
            /success|sent|ok/i.test(String(payload.status ?? payload.message ?? "")));

    if (!isSuccess) {
        console.error("MIM SMS failed:", payload);
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            responseMessage || "Failed to send SMS"
        );
    }

    return payload;
};
