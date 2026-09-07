import { NAV_ITEMS } from "./navigation.js";
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from "./theme.constants.js";
import { useState } from "react";

function useShellState() {
  const [notice, setNotice] = useState("");

  const [clockNow, setClockNow] = useState(Date.now());

  const [theme, setTheme] = useState(() => {
    const saved =
      window.localStorage?.getItem(THEME_STORAGE_KEY) || window.localStorage?.getItem(LEGACY_THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeNav, setActiveNav] = useState(NAV_ITEMS[0]);

  const [showSplash, setShowSplash] = useState(true);

  const [showLogin, setShowLogin] = useState(false);

  const [showAppInfo, setShowAppInfo] = useState(false);

  const [updateState, setUpdateState] = useState({ status: "idle", message: "" });

  return { notice, setNotice, clockNow, setClockNow, theme, setTheme, isFullscreen, setIsFullscreen, activeNav, setActiveNav, showSplash, setShowSplash, showLogin, setShowLogin, showAppInfo, setShowAppInfo, updateState, setUpdateState };
}

export { useShellState };
