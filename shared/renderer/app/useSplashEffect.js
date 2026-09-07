import { useEffect } from "react";

function useSplashEffect({
  setShowSplash
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);
}

export { useSplashEffect };
