import { getAuthAccountName, getAuthDisplayName, getAuthInitial } from "../features/auth/auth.utils.js";
import { NAV_ITEMS } from "./navigation.js";
import { Info, Moon, Sun, UserRound } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

function AppChrome({
  activeNav,
  authState,
  isFullscreen,
  onInfoClick,
  onLoginClick,
  onNavChange,
  onThemeToggle,
  theme
}) {
  const navRef = useRef(null);
  const navLabelRefs = useRef([]);
  const displayName = getAuthDisplayName(authState);
  const accountName = getAuthAccountName(authState);
  const [navUnderlineStyle, setNavUnderlineStyle] = useState({
    "--nav-underline-left": "0px",
    "--nav-underline-width": "0px"
  });

  useLayoutEffect(() => {
    function updateNavUnderline() {
      const activeIndex = NAV_ITEMS.indexOf(activeNav);
      const nav = navRef.current;
      const label = navLabelRefs.current[activeIndex];
      if (!nav || !label) return;

      const navRect = nav.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      setNavUnderlineStyle({
        "--nav-underline-left": `${labelRect.left - navRect.left}px`,
        "--nav-underline-width": `${labelRect.width}px`
      });
    }

    updateNavUnderline();
    window.addEventListener("resize", updateNavUnderline);
    return () => window.removeEventListener("resize", updateNavUnderline);
  }, [activeNav, isFullscreen]);

  return (
    <section className="app-chrome">
      <div className="chrome-left">
        <button className="profile-button" onClick={onLoginClick} title={displayName || "登录"} type="button">
          {authState?.token ? <span className="profile-initial">{getAuthInitial(accountName)}</span> : <UserRound size={16} />}
        </button>
        <nav aria-label="Primary" className="top-nav" ref={navRef}>
          {NAV_ITEMS.map((item, index) => (
            <button
              aria-current={activeNav === item ? "page" : undefined}
              className={activeNav === item ? "nav-item active" : "nav-item"}
              key={item}
              onClick={() => onNavChange(item)}
              type="button"
            >
              <span className="nav-label" ref={(node) => { navLabelRefs.current[index] = node; }}>
                {item}
              </span>
            </button>
          ))}
          <span className="nav-underline" style={navUnderlineStyle} />
        </nav>
      </div>
      <div className="drag-region" />
      <div className="window-actions">
        <button className="chrome-button" onClick={onInfoClick} title="软件信息" type="button">
          <Info size={14} />
        </button>
        <button className="chrome-button" onClick={onThemeToggle} title={theme === "dark" ? "切换浅色主题" : "切换深色主题"} type="button">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </section>
  );
}

export { AppChrome };
