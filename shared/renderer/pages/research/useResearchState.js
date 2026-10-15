import { useRef, useState } from "react";

function useResearchState() {
  const researchAccessRequestRef = useRef(0);
  const researchDataRequestRef = useRef(0);

  const [researchTab, setResearchTab] = useState("resources");

  const [researchFilters, setResearchFilters] = useState({
    from: "",
    status: "",
    to: "",
    userId: "",
    assistantKind: ""
  });

  const [researchAccessState, setResearchAccessState] = useState({ status: "idle", token: "", message: "" });

  const [researchState, setResearchState] = useState({
    status: "idle",
    users: [],
    resources: [],
    resourcesTotal: 0,
    videoCount: 0,
    audioCount: 0,
    chats: [],
    chatsTotal: 0,
    chatAgentCounts: null,
    chatAgentFiltering: false,
    statistics: null,
    selectedResourceIds: [],
    selectedChatIds: [],
    message: "",
    exportMessage: "",
    exportDownload: null
  });

  return { researchAccessRequestRef, researchDataRequestRef, researchTab, setResearchTab, researchFilters, setResearchFilters, researchAccessState, setResearchAccessState, researchState, setResearchState };
}

export { useResearchState };
