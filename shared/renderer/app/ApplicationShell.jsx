import { dlEditor } from "../services/desktop.js";
import { useApplicationContext } from "./ApplicationContext.jsx";
import { AppOverlays } from "./AppOverlays.jsx";
import { Chrome } from "./Chrome.jsx";
import { PageContent } from "./PageContent.jsx";
import { SplashScreen } from "./SplashScreen.jsx";

function ApplicationShell() {
  const { showSplash, isFullscreen } = useApplicationContext();

  return (
    <>
      <main
        aria-hidden={showSplash}
        className={[
          "app-shell",
          `platform-${dlEditor.platform || "browser"}`,
          isFullscreen ? "is-fullscreen" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Chrome />
        <PageContent />
        <AppOverlays />
      </main>
      {showSplash && <SplashScreen />}
    </>
  );
}

export { ApplicationShell };
