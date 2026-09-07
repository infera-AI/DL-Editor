import { dlEditor } from "../services/desktop.js";
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from "./theme.constants.js";
import { useEffect } from "react";

function useThemeEffects({
  theme
}) {
  useEffect(() => {
    dlEditor.setTitleBarTheme?.(theme).catch(() => undefined);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage?.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, [theme]);
}

export { useThemeEffects };
