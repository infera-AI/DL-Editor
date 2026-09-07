import { LoginDialog } from "../features/auth/LoginDialog.jsx";
import { StartTimeDialog } from "../pages/editor/components/StartTimeDialog.jsx";
import { AppInfoDialog } from "./AppInfoDialog.jsx";
import { useApplicationContext } from "./ApplicationContext.jsx";
import { APP_INFO } from "./config.js";

function AppOverlays() {
  const {
    activeNav,
    startTimeEditor,
    setStartTimeEditor,
    parseStartTimeFromFileName,
    saveStartTime,
    showAppInfo,
    activeEncoder,
    capabilities,
    checkForUpdates,
    setShowAppInfo,
    openUpdateLink,
    revealMainLog,
    outputDirectory,
    updateState,
    showLogin,
    authState,
    loginForm,
    loginMode,
    loginStatus,
    emailCodeCooldown,
    loginMethod,
    changeLoginForm,
    closeLoginDialog,
    changeLoginMethod,
    logout,
    changeLoginMode,
    sendEmailCode,
    submitRegister,
    submitLogin,
  } = useApplicationContext();

  return (
    <>
      {activeNav === "Editor" && startTimeEditor && (
        <StartTimeDialog
          editor={startTimeEditor}
          onCancel={() => setStartTimeEditor(null)}
          onChange={(changes) =>
            setStartTimeEditor((current) =>
              current ? { ...current, ...changes } : current,
            )
          }
          onParseFileName={parseStartTimeFromFileName}
          onSave={saveStartTime}
        />
      )}
      {showAppInfo && (
        <AppInfoDialog
          activeEncoder={activeEncoder}
          capabilities={capabilities}
          info={APP_INFO}
          onCheckUpdates={checkForUpdates}
          onClose={() => setShowAppInfo(false)}
          onOpenUpdate={openUpdateLink}
          onRevealLog={revealMainLog}
          outputDirectory={outputDirectory}
          updateState={updateState}
        />
      )}
      {showLogin && (
        <LoginDialog
          authState={authState}
          form={loginForm}
          mode={loginMode}
          loginStatus={loginStatus}
          emailCodeCooldown={emailCodeCooldown}
          loginMethod={loginMethod}
          onChange={changeLoginForm}
          onClose={closeLoginDialog}
          onLoginMethodChange={changeLoginMethod}
          onLogout={logout}
          onModeChange={changeLoginMode}
          onSendCode={sendEmailCode}
          onSubmit={loginMode === "register" ? submitRegister : submitLogin}
        />
      )}
    </>
  );
}

export { AppOverlays };
