import { readStoredAuth } from "./auth.storage.js";
import { useRef, useState } from "react";

function useAuthState() {
  const [authState, setAuthState] = useState(readStoredAuth);

  const [loginMode, setLoginMode] = useState("login");

  const [loginMethod, setLoginMethod] = useState("password");

  const [loginForm, setLoginForm] = useState({ identifier: "", password: "", confirmPassword: "", verificationCode: "", remember: true });

  const [loginStatus, setLoginStatus] = useState({ status: "idle", message: "" });

  const [emailCodeCooldown, setEmailCodeCooldown] = useState(0);

  const authStateRef = useRef(authState);

  const autoLoginPromptedRef = useRef(false);

  return { authState, setAuthState, loginMode, setLoginMode, loginMethod, setLoginMethod, loginForm, setLoginForm, loginStatus, setLoginStatus, emailCodeCooldown, setEmailCodeCooldown, authStateRef, autoLoginPromptedRef };
}

export { useAuthState };
