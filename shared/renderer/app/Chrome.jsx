import { AppChrome } from "./AppChrome.jsx";
import { useApplicationContext } from "./ApplicationContext.jsx";

function Chrome() {
  const {
    activeNav,
    authState,
    isFullscreen,
    setShowLogin,
    setActiveNav,
    setShowAppInfo,
    setTheme,
    theme,
  } = useApplicationContext();

  return (
    <AppChrome
      activeNav={activeNav}
      authState={authState}
      isFullscreen={isFullscreen}
      onLoginClick={() => setShowLogin(true)}
      onNavChange={setActiveNav}
      onInfoClick={() => setShowAppInfo(true)}
      onThemeToggle={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
      theme={theme}
    />
  );
}

export { Chrome };
