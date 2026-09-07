import { useState } from "react";

function useEngineState() {
  const [engineUnlocked, setEngineUnlocked] = useState(false);

  const [enginePassword, setEnginePassword] = useState("");

  const [engineError, setEngineError] = useState("");

  return { engineUnlocked, setEngineUnlocked, enginePassword, setEnginePassword, engineError, setEngineError };
}

export { useEngineState };
