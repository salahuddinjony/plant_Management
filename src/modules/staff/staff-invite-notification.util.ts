import config from "../../config";
import { sendHtmlEmail } from "../../utils/emailService";
import { sendMimSms } from "../../utils/smsService";
import { toMimMobileNumber } from "../../utils/identifierChannel.util";
import { getStaffRoleTemplate } from "../rbac/role-templates";
import { TStaffRoleSlug } from "../rbac/staff-role.constants";
import { buildInviteDeepLink } from "./staff-invite.util";

const buildStaffInviteEmailHtml = ({
    name,
    roleName,
    inviteLink,
    inviteCode,
    expiryDays,
}: {
    name: string;
    roleName: string;
    inviteLink: string;
    inviteCode: string;
    expiryDays: number;
}) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Admin invite</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:10px;padding:32px;">
      <h1 style="color:#166534;font-size:22px;">Nursery Bazar Admin</h1>
      <p>Hello ${name},</p>
      <p>You have been invited as <strong>${roleName}</strong>.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Accept invite</a>
      </p>
      <p style="color:#666;font-size:14px;">If the app is not installed, the link will show install instructions.</p>
      <p style="background:#f8f9fa;padding:12px;border-radius:6px;text-align:center;">
        <span style="color:#666;font-size:13px;">Invite code:</span><br/>
        <strong style="font-size:22px;letter-spacing:3px;">${inviteCode}</strong>
      </p>
      <p style="color:#999;font-size:12px;">Valid for ${expiryDays} days. Open the Admin app → Accept invite → set your password.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendStaffInviteNotification = async ({
    name,
    emailOrPhone,
    channel,
    staffRole,
    plainToken,
    inviteCode,
}: {
    name: string;
    emailOrPhone: string;
    channel: "email" | "sms";
    staffRole: TStaffRoleSlug;
    plainToken: string;
    inviteCode: string;
}) => {
    const roleName = getStaffRoleTemplate(staffRole).name;
    const inviteLink = buildInviteDeepLink(config.adminInviteBaseUrl, plainToken);
    const expiryDays = config.staffInviteExpiryDays;

    if (channel === "email") {
        await sendStaffInviteEmail({
            email: emailOrPhone,
            name,
            roleName,
            inviteLink,
            inviteCode,
            expiryDays,
        });
        return { channel, inviteLink };
    }

    const smsText = `Nursery Bazar Admin: Invited as ${roleName}. Invite code: ${inviteCode} (${expiryDays}d).`;
    await sendMimSms(toMimMobileNumber(emailOrPhone), smsText);
    return { channel, inviteLink };
};

const sendStaffInviteEmail = async (params: {
    email: string;
    name: string;
    roleName: string;
    inviteLink: string;
    inviteCode: string;
    expiryDays: number;
}) => {
    const { email, name, roleName, inviteLink, inviteCode, expiryDays } = params;

    await sendHtmlEmail({
        email,
        subject: `You're invited to Nursery Bazar Admin (${roleName})`,
        html: buildStaffInviteEmailHtml({ name, roleName, inviteLink, inviteCode, expiryDays }),
    });
};
