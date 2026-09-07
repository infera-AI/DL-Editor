import { createEmailVerificationToken, loginToInfera, loginToInferaWithEmailCode, registerWithInfera, sendEmailVerificationCode } from "./auth.api.js";
import { EMAIL_IDENTIFIER_PATTERN } from "./auth.constants.js";
import { getAuthenticationErrorMessage } from "./auth.utils.js";

function createAuthActions({
  loginMethod,
  loginForm,
  setLoginStatus,
  completeAuthentication,
  loginMode,
  setLoginForm,
  setEmailCodeCooldown,
  setNotice,
  setLoginMode,
  setLoginMethod,
  loginStatus,
  setShowLogin
}) {
  async function submitLogin() {
    if (loginMethod === "code") {
      await submitEmailCodeLogin();
      return;
    }

    const rawIdentifier = loginForm.identifier.trim();
    const identifier = rawIdentifier.toLowerCase();
    if (!identifier || !loginForm.password) {
      setLoginStatus({ status: "error", message: "请输入账号和密码" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在登录..." });
    try {
      const result = await loginToInfera({ identifier, password: loginForm.password });
      completeAuthentication(result, identifier, "登录响应缺少 token");
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "登录验证失败")
      });
    }
  }

  async function submitEmailCodeLogin() {
    const email = loginForm.identifier.trim().toLowerCase();
    const verificationCode = loginForm.verificationCode.trim();
    if (!email || !verificationCode) {
      setLoginStatus({ status: "error", message: "请输入邮箱和验证码" });
      return;
    }
    if (!EMAIL_IDENTIFIER_PATTERN.test(email)) {
      setLoginStatus({ status: "error", message: "请输入有效的邮箱地址" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在验证并登录..." });
    try {
      const verification = await createEmailVerificationToken(email, verificationCode, "login");
      const verificationToken = verification?.verificationToken || verification?.verification_token || "";
      if (!verificationToken) {
        throw new Error("验证码验证响应缺少 verification token");
      }
      const result = await loginToInferaWithEmailCode({ email, verificationToken });
      completeAuthentication(result, email, "登录响应缺少 token");
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "邮箱验证码登录失败")
      });
    }
  }

  async function sendEmailCode() {
    const email = loginForm.identifier.trim().toLowerCase();
    if (!EMAIL_IDENTIFIER_PATTERN.test(email)) {
      setLoginStatus({ status: "error", message: "请先输入有效的邮箱地址" });
      return;
    }

    setLoginStatus({ status: "sending", message: "正在发送验证码..." });
    try {
      const purpose = loginMode === "register" ? "register" : "login";
      const result = await sendEmailVerificationCode(email, purpose);
      const cooldownSeconds = Math.max(1, Number(result?.cooldownSeconds || result?.cooldown_seconds) || 60);
      setLoginForm((current) => ({ ...current, identifier: email, verificationCode: "" }));
      setEmailCodeCooldown(cooldownSeconds);
      setLoginStatus({ status: "success", message: `验证码已发送至 ${email}` });
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "验证码发送失败")
      });
    }
  }

  async function submitRegister() {
    const identifier = loginForm.identifier.trim().toLowerCase();
    const verificationCode = loginForm.verificationCode.trim();
    if (!identifier || !verificationCode || !loginForm.password || !loginForm.confirmPassword) {
      setLoginStatus({ status: "error", message: "请输入邮箱、验证码、密码并确认密码" });
      return;
    }
    if (!EMAIL_IDENTIFIER_PATTERN.test(identifier)) {
      setLoginStatus({ status: "error", message: "请输入有效的邮箱地址" });
      return;
    }
    if (loginForm.password !== loginForm.confirmPassword) {
      setLoginStatus({ status: "error", message: "两次输入的密码不一致" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在验证并注册..." });
    try {
      const verification = await createEmailVerificationToken(identifier, verificationCode, "register");
      const verificationToken = verification?.verificationToken || verification?.verification_token || "";
      if (!verificationToken) {
        throw new Error("验证码验证响应缺少 verification token");
      }
      const result = await registerWithInfera({
        email: identifier,
        password: loginForm.password,
        verificationToken
      });
      completeAuthentication(result, identifier, "注册响应缺少 token");
      setNotice("注册成功，已自动登录");
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "注册失败")
      });
    }
  }

  function changeLoginMode(mode) {
    setLoginMode(mode);
    setLoginMethod("password");
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, password: "", confirmPassword: "", verificationCode: "" }));
  }

  function changeLoginMethod(method) {
    setLoginMethod(method);
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, password: "", verificationCode: "" }));
  }

  function changeLoginForm(changes) {
    if ((loginMode === "register" || loginMethod === "code") && Object.prototype.hasOwnProperty.call(changes, "identifier")) {
      setEmailCodeCooldown(0);
      if (loginStatus.status !== "checking" && loginStatus.status !== "sending") {
        setLoginStatus({ status: "idle", message: "" });
      }
    }
    setLoginForm((current) => ({ ...current, ...changes }));
  }

  function closeLoginDialog() {
    setShowLogin(false);
    setLoginMode("login");
    setLoginMethod("password");
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, password: "", confirmPassword: "", verificationCode: "" }));
  }

  return { submitLogin, submitEmailCodeLogin, sendEmailCode, submitRegister, changeLoginMode, changeLoginMethod, changeLoginForm, closeLoginDialog };
}

export { createAuthActions };
