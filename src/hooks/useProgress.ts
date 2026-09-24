import { useCallback, useEffect, useState } from "react";
import { emptyProgress, loadProgress, type ProgressState } from "@/lib/progress";

/** Reads localStorage after hydration so SSR and client markup match. */
export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setProgress(loadProgress()), []);

  useEffect(() => {
    refresh();
    setReady(true);
    const handler = () => refresh();
    window.addEventListener("astrotrainer:progress", handler);
    return () => window.removeEventListener("astrotrainer:progress", handler);
  }, [refresh]);

  return { progress, ready, refresh };
}
