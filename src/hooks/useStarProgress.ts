import { useCallback, useEffect, useState } from "react";
import { emptyStarProgress, loadStarProgress, type StarProgressState } from "@/lib/starProgress";

export function useStarProgress() {
  const [progress, setProgress] = useState<StarProgressState>(emptyStarProgress);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setProgress(loadStarProgress()), []);

  useEffect(() => {
    refresh();
    setReady(true);
    const handler = () => refresh();
    window.addEventListener("astrotrainer:star-progress", handler);
    return () => window.removeEventListener("astrotrainer:star-progress", handler);
  }, [refresh]);

  return { progress, ready, refresh };
}
