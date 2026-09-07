import { requestInfera } from "../../services/infera.js";
import { inferIdentifierType } from "./auth.utils.js";

async function loginToInfera({ identifier, password }) {
  const value = String(identifier || "").trim();
  const identifierType = inferIdentifierType(value);
  return requestInfera("/auth/login", {
    method: "POST",
    body: {
      type: identifierType,
      identifier: value.toLowerCase(),
      password
    }
  });
}

async function loginToInferaWithEmailCode({ email, verificationToken }) {
  return requestInfera("/auth/login/email/", {
    method: "POST",
    body: {
      email: String(email || "").trim().toLowerCase(),
      verificationToken
    }
  });
}

async function sendEmailVerificationCode(email, purpose) {
  return requestInfera("/verification/codes", {
    method: "POST",
    body: {
      account: String(email || "").trim().toLowerCase(),
      purpose,
      channel: "email"
    }
  });
}

async function createEmailVerificationToken(email, code, purpose) {
  return requestInfera("/verification/tokens", {
    method: "POST",
    body: {
      account: String(email || "").trim().toLowerCase(),
      purpose,
      channel: "email",
      code: String(code || "").trim()
    }
  });
}

async function registerWithInfera({ email, password, verificationToken }) {
  return requestInfera("/auth/register/email/", {
    method: "POST",
    body: {
      email: String(email || "").trim().toLowerCase(),
      password,
      verificationToken
    }
  });
}

async function fetchCurrentUser(token) {
  return requestInfera("/users/me", { token });
}

export { loginToInfera, loginToInferaWithEmailCode, sendEmailVerificationCode, createEmailVerificationToken, registerWithInfera, fetchCurrentUser };
