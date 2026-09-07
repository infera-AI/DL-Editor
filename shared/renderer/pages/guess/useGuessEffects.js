import { useEffect } from "react";

function useGuessEffects({
  activeNav,
  loadGuesses,
  authState
}) {
  useEffect(() => {
    if (activeNav !== "Guess") {
      return;
    }

    loadGuesses(authState);
  }, [activeNav, authState?.token]);
}

export { useGuessEffects };
