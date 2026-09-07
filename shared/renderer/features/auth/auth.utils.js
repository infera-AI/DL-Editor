import { EMAIL_IDENTIFIER_PATTERN, PHONE_IDENTIFIER_PATTERN } from "./auth.constants.js";

function inferIdentifierType(identifier) {
  const value = String(identifier || "").trim();
  if (EMAIL_IDENTIFIER_PATTERN.test(value)) return "email";
  if (PHONE_IDENTIFIER_PATTERN.test(value)) return "phone";
  return "username";
}

function getAuthenticationErrorMessage(error, fallback) {
  const message = String(error?.message || "").trim();
  if (/Account already exists/i.test(message)) return "该账号已注册，请直接登录";
  if (/Invalid account or password/i.test(message)) return "账号或密码错误";
  if (/Invalid account or verification token/i.test(message)) return "邮箱或验证码错误";
  if (/User is disabled/i.test(message)) return "该账号已停用";
  if (/verification code was sent too recently/i.test(message)) return "验证码发送过于频繁，请稍后重试";
  if (/verification code is invalid or expired/i.test(message)) return "验证码错误或已过期，请重新获取";
  if (/verification token is invalid or expired/i.test(message)) return "验证码验证已过期，请重新获取";
  if (/Identifier cannot be blank|Type cannot be blank/i.test(message)) return "请输入有效的邮箱或手机号";
  if (/Password cannot be blank/i.test(message)) return "请输入密码";
  return message || fallback;
}

function getAuthDisplayName(authState) {
  if (!authState?.token) return "";
  return authState.displayName || authState.nickname || authState.email || authState.phone || (authState.userId ? `User ${authState.userId}` : "已登录");
}

function getAuthAccountName(authState) {
  if (!authState?.token) return "";
  const emailName = authState.email ? String(authState.email).split("@")[0] : "";
  return authState.accountName || emailName || authState.phone || authState.userId || getAuthDisplayName(authState);
}

function getAuthInitial(accountName) {
  const normalized = String(accountName || "").trim();
  if (!normalized) return "";
  const firstWord = normalized.split(/\s+/).find(Boolean) || normalized;
  return Array.from(firstWord)[0]?.toLocaleUpperCase() || "";
}

export { inferIdentifierType, getAuthenticationErrorMessage, getAuthDisplayName, getAuthAccountName, getAuthInitial };
