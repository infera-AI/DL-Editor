import { APP_NAME } from "./config.js";
import appIconUrl from "@platform/icon";

function SplashScreen() {
  return (
    <section aria-label={`${APP_NAME} 启动中`} className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo-frame">
          <img alt="" className="splash-logo" draggable="false" src={appIconUrl} />
        </div>
        <h1>{APP_NAME}</h1>
        <div className="splash-progress" />
      </div>
    </section>
  );
}

export { SplashScreen };
