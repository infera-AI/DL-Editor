import { useRef, useState } from "react";

function useResearchState() {
  const researchAccessRequestRef = useRef(0);

  const [researchTab, setResearchTab] = useState("resources");

  const [researchFilters, setResearchFilters] = useState({
    from: "",
    status: "",
    to: "",
    userId: ""
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
    statistics: null,
    selectedResourceIds: [],
    selectedChatIds: [],
    message: "",
    exportMessage: "",
    exportDownload: null
  });

  return { researchAccessRequestRef, researchTab, setResearchTab, researchFilters, setResearchFilters, researchAccessState, setResearchAccessState, researchState, setResearchState };
}

export { useResearchState };
