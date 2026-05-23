import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env") });

function buildMongoUriFromParts() {
  const host = process.env.MONGO_HOST; // e.g. cluster0.xxxxx.mongodb.net
  const dbName = process.env.MONGO_DB || process.env.MONGO_DATABASE; // optional
  const user = process.env.MONGO_USER || process.env.MONGODB_USER;
  const pass = process.env.MONGO_PASSWORD || process.env.MONGODB_PASSWORD;

  if (!host || !user || !pass) return undefined;

  const encodedUser = encodeURIComponent(user);
  const encodedPass = encodeURIComponent(pass);
  const dbPath = dbName ? `/${encodeURIComponent(dbName)}` : "";

  // Keep it simple; appName/authSource/etc can be appended via MONGO_OPTIONS.
  const url = new URL(`mongodb+srv://${encodedUser}:${encodedPass}@${host}${dbPath}`);
  const options = process.env.MONGO_OPTIONS; // e.g. "retryWrites=true&w=majority&appName=Cluster0"
  if (options) {
    for (const pair of options.split("&")) {
      const [k, v] = pair.split("=");
      if (!k) continue;
      url.searchParams.set(k, v ?? "");
    }
  }
  return url.toString();
}

function normalizeMongoUri(uri: string) {
  if (!uri) return uri;
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) return uri;

  // Node's URL supports custom schemes like mongodb://
  const url = new URL(uri);
  // Only set authSource when explicitly requested. Defaulting to `admin` can
  // break setups where the DB user was created for the database in the URI path.
  const explicitAuthSource = process.env.MONGO_AUTH_SOURCE || process.env.MONGODB_AUTH_SOURCE;
  if (explicitAuthSource) url.searchParams.set("authSource", explicitAuthSource);
  return url.toString();
}

const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  buildMongoUriFromParts() ||
  "";
const mongoUri = rawMongoUri ? normalizeMongoUri(rawMongoUri) : undefined;
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "30";
const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "360";
const smtpUserName = process.env.SMTP_USERNAME || process.env.SMTP_USER;

export default {
  PORT: process.env.PORT || 8050,
  MONGO_URI: mongoUri,
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn,
  jwtRefreshExpiresIn,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
  smtpUserName,
  smtpPassword: process.env.SMTP_PASSWORD?.replace(/\s+/g, "").trim(),
  clientUrl: process.env.CLIENT_URL,
  smsApiKey: process.env.SMS_API_KEY,
  smsSenderName: process.env.SMS_SENDER_NAME,
  smsUserName: process.env.SMS_USER_NAME,
  mimSmsUrl: process.env.MIM_SMS_URL,
  adminInviteBaseUrl:
    process.env.ADMIN_INVITE_BASE_URL || "http://143.244.134.128:8050/invite",
  adminAppDeepLinkScheme: process.env.ADMIN_APP_DEEP_LINK_SCHEME || "nurseryadmin",
  androidAdminAppPackage: process.env.ANDROID_ADMIN_APP_PACKAGE || "",
  staffInviteExpiryDays: Number(process.env.STAFF_INVITE_EXPIRY_DAYS) || 7,
  androidPlayStoreUrl: process.env.ANDROID_PLAY_STORE_URL || "",
  iosAppStoreUrl: process.env.IOS_APP_STORE_URL || "",
};
