import { useEffect } from "react";

function useResearchEffects({
  activeNav,
  authState,
  researchAccessRequestRef,
  setResearchAccessState,
  setResearchState,
  researchAccessState,
  loadResearchAccess,
  loadResearchData,
  researchTab,
  researchFilters
}) {
  useEffect(() => {
    if (activeNav !== "Research") {
      return;
    }

    if (!authState?.token) {
      researchAccessRequestRef.current += 1;
      setResearchAccessState({ status: "auth", token: "", message: "" });
      setResearchState((current) => ({
        ...current,
        status: "auth",
        resources: [],
        resourcesTotal: 0,
        chats: [],
        chatsTotal: 0,
        message: "请先登录后查看 Research"
      }));
      return;
    }

    if (
      researchAccessState.token === authState.token &&
      ["checking", "allowed", "forbidden", "error"].includes(researchAccessState.status)
    ) {
      return;
    }

    loadResearchAccess(authState);
  }, [activeNav, authState?.token, researchAccessState.status, researchAccessState.token]);

  useEffect(() => {
    if (
      activeNav !== "Research" ||
      !authState?.token ||
      researchAccessState.status !== "allowed" ||
      researchAccessState.token !== authState.token
    ) {
      return;
    }

    loadResearchData(researchTab, authState, researchFilters);
  }, [
    activeNav,
    authState?.token,
    researchAccessState.status,
    researchAccessState.token,
    researchFilters.from,
    researchFilters.status,
    researchFilters.to,
    researchFilters.userId,
    researchTab
  ]);
}

export { useResearchEffects };
