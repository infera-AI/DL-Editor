import { AUTH_STORAGE_KEY } from "../features/auth/auth.constants.js";
import { getDefaultCloudStatusFilterIdForSpace } from "../pages/cloud/cloud.utils.js";
import { normalizeAuthPayload } from "../services/auth-payload.js";

function createSessionActions({
  loginForm,
  authStateRef,
  setAuthState,
  setLoginMode,
  setLoginMethod,
  setLoginStatus,
  setEmailCodeCooldown,
  setLoginForm,
  setShowLogin,
  activeNav,
  loadCloudRepository,
  cloudSpaceId,
  cloudRepositoryDateKey,
  cloudRepositoryStatusFilterId,
  loadResearchAccess,
  researchAccessRequestRef,
  setResearchAccessState,
  setRepositoryState
}) {
  function completeAuthentication(result, identifier, missingTokenMessage) {
    const nextAuth = normalizeAuthPayload(result, identifier);
    if (!nextAuth.token) {
      throw new Error(missingTokenMessage);
    }

    if (loginForm.remember) {
      window.localStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    } else {
      window.localStorage?.removeItem(AUTH_STORAGE_KEY);
    }

    authStateRef.current = nextAuth;
    setAuthState(nextAuth);
    setLoginMode("login");
    setLoginMethod("password");
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, identifier, password: "", confirmPassword: "", verificationCode: "" }));
    setShowLogin(false);

    if (activeNav === "Cloud") {
      loadCloudRepository(nextAuth, cloudSpaceId, cloudRepositoryDateKey, cloudRepositoryStatusFilterId);
    } else if (activeNav === "Research") {
      loadResearchAccess(nextAuth);
    }
  }

  function logout() {
    researchAccessRequestRef.current += 1;
    window.localStorage?.removeItem(AUTH_STORAGE_KEY);
    authStateRef.current = null;
    setAuthState(null);
    setLoginStatus({ status: "idle", message: "" });
    setResearchAccessState({ status: "auth", token: "", message: "" });
    setRepositoryState({
      status: "auth",
      spaceId: cloudSpaceId,
      dateKey: cloudSpaceId === "rawdata" ? "" : cloudRepositoryDateKey,
      filterId: getDefaultCloudStatusFilterIdForSpace(cloudSpaceId),
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      nextOffset: 0,
      message: "请先登录后查看 Cloud repository"
    });
  }

  return { completeAuthentication, logout };
}

export { createSessionActions };
