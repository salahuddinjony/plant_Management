import status from "http-status";
import config from "../config";
import AppError from "../errors/AppError";

type MimSmsResponse = {
    status?: string;
    statusCode?: number;
    message?: string;
    data?: unknown;
};

export const sendMimSms = async (mobileNumber: string, message: string) => {
    if (!config.smsApiKey || !config.mimSmsUrl || !config.smsUserName) {
        throw new AppError(
            status.INTERNAL_SERVER_ERROR,
            "SMS provider is not configured"
        );
    }

    const body = {
        ApiKey: config.smsApiKey,
        MobileNumber: mobileNumber,
        SenderName: config.smsSenderName || "8809643902635",
        UserName: config.smsUserName,
        TransactionType: "T",
        Message: message,
        CampaignId:config.smsCampaignName || "Live",
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
