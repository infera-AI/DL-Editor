import { ENGINE_PASSWORD } from "./engine.constants.js";

function createEngineActions({
  enginePassword,
  setEngineUnlocked,
  setEnginePassword,
  setEngineError
}) {
  function unlockEngine() {
    if (enginePassword === ENGINE_PASSWORD) {
      setEngineUnlocked(true);
      setEnginePassword("");
      setEngineError("");
      return;
    }

    setEngineError("密码错误");
  }

  function lockEngine() {
    setEngineUnlocked(false);
    setEnginePassword("");
    setEngineError("");
  }

  return { unlockEngine, lockEngine };
}

export { createEngineActions };
