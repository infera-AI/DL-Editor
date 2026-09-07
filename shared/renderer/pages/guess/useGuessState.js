import { useRef, useState } from "react";

function useGuessState() {
  const guessRequestRef = useRef(0);

  const [guessState, setGuessState] = useState({
    status: "idle",
    items: [],
    itemMap: {},
    registryMap: {},
    selectedId: null,
    nextCursor: null,
    message: "",
    notice: ""
  });

  return { guessRequestRef, guessState, setGuessState };
}

export { useGuessState };
