import { INFERA_AUTH_EXPIRED_MESSAGE, setInferaAuthController } from "../../services/infera.js";
import { logRendererEvent } from "../../services/logging.js";
import { AUTH_STORAGE_KEY } from "./auth.constants.js";
import { readStoredAuth } from "./auth.storage.js";
import { getAuthAccountName } from "./auth.utils.js";
import { useEffect } from "react";

function useAuthEffects({
  authStateRef,
  authState,
  autoLoginPromptedRef,
  emailCodeCooldown,
  setEmailCodeCooldown,
  setAuthState,
  researchAccessRequestRef,
  setLoginMode,
  setLoginMethod,
  setLoginForm,
  setLoginStatus,
  setNotice,
  setShowLogin
}) {
  useEffect(() => {
    authStateRef.current = authState;
    if (authState?.token) {
      autoLoginPromptedRef.current = false;
    }
  }, [authState]);

  useEffect(() => {
    if (emailCodeCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setEmailCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [emailCodeCooldown]);

  useEffect(() => {
    const controller = {
      getAuth: () => authStateRef.current,
      onRefreshed: (nextAuth, previousAuth) => {
        authStateRef.current = nextAuth;
        setAuthState(nextAuth);
        const storedAuth = readStoredAuth();
        if (
          storedAuth &&
          (storedAuth.refreshToken === previousAuth?.refreshToken || storedAuth.token === previousAuth?.token)
        ) {
          window.localStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
        }
        logRendererEvent("Infera access token refreshed", { userId: nextAuth.userId });
      },
      onExpired: () => {
        const previousAuth = authStateRef.current;
        researchAccessRequestRef.current += 1;
        window.localStorage?.removeItem(AUTH_STORAGE_KEY);
        authStateRef.current = null;
        setAuthState(null);
        setLoginMode("login");
        setLoginMethod("password");
        setEmailCodeCooldown(0);
        setLoginForm((current) => ({
          ...current,
          identifier: current.identifier || getAuthAccountName(previousAuth),
          password: "",
          confirmPassword: "",
          verificationCode: ""
        }));
        setLoginStatus({ status: "error", message: INFERA_AUTH_EXPIRED_MESSAGE });
        setNotice(INFERA_AUTH_EXPIRED_MESSAGE);
        setShowLogin(true);
        logRendererEvent("Infera session expired", { userId: previousAuth?.userId || "" }, "warn");
      },
      onRefreshError: (error) => {
        setNotice(error.message || "登录状态刷新失败，请检查网络后重试");
        logRendererEvent("Infera token refresh failed", { message: error.message || "" }, "warn");
      }
    };
    return setInferaAuthController(controller);
  }, []);
}

export { useAuthEffects };
