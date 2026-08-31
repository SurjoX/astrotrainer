import { useCallback, useEffect, useState } from "react";
import {
  ASTERISM_PROGRESS_EVENT,
  emptyAsterismProgress,
  loadAsterismProgress,
  type AsterismProgressState,
} from "@/lib/asterismProgress";

/** Reads localStorage after hydration so SSR and client markup match. */
export function useAsterismProgress() {
  const [progress, setProgress] = useState<AsterismProgressState>(emptyAsterismProgress);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setProgress(loadAsterismProgress()), []);

  useEffect(() => {
    refresh();
    setReady(true);
    const handler = () => refresh();
    window.addEventListener(ASTERISM_PROGRESS_EVENT, handler);
    return () => window.removeEventListener(ASTERISM_PROGRESS_EVENT, handler);
  }, [refresh]);

  return { progress, ready, refresh };
}
