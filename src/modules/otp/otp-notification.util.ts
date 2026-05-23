import { TOtpPurpose } from "./otp.constants";
import { TOtpChannel } from "./otp.interface";
import { sendEmail } from "../../utils/emailService";
import { toMimMobileNumber } from "../../utils/identifierChannel.util";
import { sendMimSms } from "../../utils/smsService";

const purposeLabels: Record<TOtpPurpose, string> = {
    signup: "account verification",
    forgot_password: "password reset",
};

const buildOtpSmsMessage = (purpose: TOtpPurpose, otp: string) => {
    const label = purposeLabels[purpose];
    return `Your Nursery Bazar BD ${label} code is ${otp}. Valid for 5 minutes. Do not share this code.`;
};

const emailSubjects: Record<TOtpPurpose, string> = {
    signup: "Verify Your Account - Nursery Bazar BD",
    forgot_password: "Password Reset Code - Nursery Bazar BD",
};

const emailTitles: Record<TOtpPurpose, string> = {
    signup: "Account Verification",
    forgot_password: "Password Reset",
};

export const sendOtpNotification = async ({
    identifier,
    channel,
    purpose,
    otp,
    userName,
}: {
    identifier: string;
    channel: TOtpChannel;
    purpose: TOtpPurpose;
    otp: string;
    userName?: string;
}) => {
    if (channel === "email") {
        await sendEmail({
            email: identifier,
            token: otp,
            username: userName ?? identifier.split("@")[0],
            subject: emailSubjects[purpose],
            title: emailTitles[purpose],
            intro: `Use the code below to complete your ${purposeLabels[purpose]}:`,
        });
        return;
    }

    await sendMimSms(toMimMobileNumber(identifier), buildOtpSmsMessage(purpose, otp));
};
