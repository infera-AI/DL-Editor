import { useApplicationContext } from "../../app/ApplicationContext.jsx";
import { EngineGate } from "./components/EngineGate.jsx";
import { EngineWorkspace } from "./components/EngineWorkspace.jsx";

function EnginePage() {
  const {
    engineUnlocked,
    authState,
    lockEngine,
    setShowLogin,
    engineError,
    setEnginePassword,
    setEngineError,
    unlockEngine,
    enginePassword,
  } = useApplicationContext();

  return engineUnlocked ? (
    <EngineWorkspace
      authState={authState}
      onLock={lockEngine}
      onLogin={() => setShowLogin(true)}
    />
  ) : (
    <EngineGate
      error={engineError}
      onChange={(value) => {
        setEnginePassword(value);
        setEngineError("");
      }}
      onSubmit={unlockEngine}
      value={enginePassword}
    />
  );
}

export { EnginePage };
