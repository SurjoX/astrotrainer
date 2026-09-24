import { useCallback, useEffect, useState } from "react";
import {
  emptyMessierProgress,
  loadMessierProgress,
  type MessierProgressState,
} from "@/lib/messierProgress";

export function useMessierProgress() {
  const [progress, setProgress] = useState<MessierProgressState>(emptyMessierProgress);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(() => setProgress(loadMessierProgress()), []);

  useEffect(() => {
    refresh();
    setReady(true);
    const handler = () => refresh();
    window.addEventListener("astrotrainer:messier-progress", handler);
    return () => window.removeEventListener("astrotrainer:messier-progress", handler);
  }, [refresh]);

  return { progress, ready, refresh };
}
