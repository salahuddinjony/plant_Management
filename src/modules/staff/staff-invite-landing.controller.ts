import { Request, Response } from "express";
import config from "../../config";
import { getInviteLandingContext } from "./staff.service";

const APP_OPEN_TIMEOUT_MS = 2500;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const buildWebInviteUrl = (req: Request, token: string): string => {
    const host = req.get("host");
    const protocol = req.protocol || "http";
    const base = host ? `${protocol}://${host}/invite` : config.adminInviteBaseUrl.replace(/\/$/, "");
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};

const buildAppDeepLink = (token: string): string => {
    const scheme = config.adminAppDeepLinkScheme.replace(/:\/\//, "").replace(/\/$/, "");
    return `${scheme}://accept-invite?token=${encodeURIComponent(token)}`;
};

const buildAndroidIntentUrl = (token: string): string | null => {
    const pkg = config.androidAdminAppPackage.trim();
    if (!pkg) return null;
    const scheme = config.adminAppDeepLinkScheme.replace(/:\/\//, "").replace(/\/$/, "");
    return (
        `intent://accept-invite?token=${encodeURIComponent(token)}` +
        `#Intent;scheme=${scheme};package=${pkg};end`
    );
};

export const renderStaffInviteLanding = async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    const context = await getInviteLandingContext(token);

    const playStore = config.androidPlayStoreUrl || "#";
    const appStore = config.iosAppStoreUrl || "#";
    const appDeepLink = token ? buildAppDeepLink(token) : "";
    const androidIntentUrl = token ? buildAndroidIntentUrl(token) : null;
    const webInviteUrl = buildWebInviteUrl(req, token);

    const isValid = context.valid && Boolean(token);
    const roleName = context.roleName ? escapeHtml(context.roleName) : "";

    const headline = isValid
        ? `You&rsquo;re invited as <strong style="color:#15803d;">${roleName}</strong>`
        : "This invite link is invalid or expired";

    const subline = isValid
        ? "Tap <strong>Accept invite</strong> to open the Admin app. If the app is not installed, use the store links below."
        : "Ask your administrator to send a new invite.";

    const acceptButton = isValid
        ? `<button
        type="button"
        id="accept-btn"
        onclick="tryOpenApp()"
        style="display:block;width:100%;padding:16px 20px;margin:0 0 12px;border:none;border-radius:10px;background:#16a34a;color:#ffffff;font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.35);"
      >
        Accept invite
      </button>
      <p id="accept-hint" style="margin:0 0 12px;font-size:13px;color:#6b7280;text-align:center;line-height:1.5;">
        Deep link: <code style="font-size:11px;word-break:break-all;">${escapeHtml(config.adminAppDeepLinkScheme)}://accept-invite?token=…</code>
      </p>`
        : `<p style="margin:0 0 20px;padding:14px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:14px;line-height:1.5;">
        No active invite was found for this link.
      </p>`;

    const installSection = isValid
        ? `<div id="install-help" style="display:none;margin-top:8px;padding-top:20px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">App not opening?</p>
        <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.55;">
          Install the Admin app, open it, go to <strong>Accept invite</strong>, and paste the invite code from your email/SMS (6 characters) or open this page again.
        </p>
        <a href="${escapeHtml(playStore)}" style="display:block;text-align:center;padding:14px;margin:0 0 10px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
          Get it on Google Play
        </a>
        <a href="${escapeHtml(appStore)}" style="display:block;text-align:center;padding:14px;margin:0 0 10px;border-radius:10px;background:#f3f4f6;color:#111827;text-decoration:none;font-weight:600;font-size:15px;">
          Download on the App Store
        </a>
      </div>`
        : "";

    const script = isValid
        ? `<script>
      (function () {
        var appUrl = ${JSON.stringify(appDeepLink)};
        var androidIntent = ${JSON.stringify(androidIntentUrl)};
        var isAndroid = /Android/i.test(navigator.userAgent);
        var acceptBtn = document.getElementById("accept-btn");
        var installHelp = document.getElementById("install-help");
        var acceptHint = document.getElementById("accept-hint");

        function openDeepLink(url) {
          if (!url) return;
          window.location.href = url;
        }

        window.tryOpenApp = function () {
          if (!appUrl) return;

          var openedAt = Date.now();
          if (acceptBtn) {
            acceptBtn.disabled = true;
            acceptBtn.textContent = "Opening app…";
            acceptBtn.style.opacity = "0.85";
          }

          if (isAndroid && androidIntent) {
            openDeepLink(androidIntent);
            setTimeout(function () {
              openDeepLink(appUrl);
            }, 400);
          } else {
            openDeepLink(appUrl);
          }

          setTimeout(function () {
            var likelyStillOnPage = !document.hidden && Date.now() - openedAt < 4000;
            if (likelyStillOnPage && installHelp) {
              installHelp.style.display = "block";
              if (acceptHint) {
                acceptHint.textContent = "Install the app, then tap Accept invite again.";
              }
            }
            if (acceptBtn) {
              acceptBtn.disabled = false;
              acceptBtn.textContent = "Accept invite";
              acceptBtn.style.opacity = "1";
            }
          }, ${APP_OPEN_TIMEOUT_MS});
        };
      })();
    </script>`
        : "";

    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#f0fdf4" />
  <title>Accept invite · Nursery Bazar Admin</title>
</head>
<body style="margin:0;padding:20px 16px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(180deg,#f0fdf4 0%,#ecfdf5 40%,#f8fafc 100%);min-height:100vh;box-sizing:border-box;">
  <div style="max-width:420px;margin:0 auto;">
    <div style="background:#ffffff;border-radius:16px;padding:28px 24px 24px;box-shadow:0 8px 32px rgba(0,0,0,0.08);border:1px solid rgba(22,101,52,0.08);">
      <div style="width:52px;height:52px;border-radius:14px;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px;line-height:1;" aria-hidden="true">🌱</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#166534;text-align:center;line-height:1.3;">
        Nursery Bazar Admin
      </h1>
      <p style="margin:0 0 6px;font-size:15px;color:#374151;text-align:center;line-height:1.5;">
        ${headline}
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;text-align:center;line-height:1.55;">
        ${subline}
      </p>
      ${acceptButton}
      ${installSection}
      ${
          isValid
              ? `<ol style="margin:20px 0 0;padding:0 0 0 20px;font-size:13px;color:#6b7280;line-height:1.7;">
        <li>Tap <strong>Accept invite</strong> (opens app via deep link)</li>
        <li>Set your password in the app</li>
        <li>Sign in with your email or phone</li>
      </ol>`
              : ""
      }
    </div>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.5;word-break:break-all;">
      Web link: ${escapeHtml(webInviteUrl)}
    </p>
  </div>
  ${script}
</body>
</html>`);
};
