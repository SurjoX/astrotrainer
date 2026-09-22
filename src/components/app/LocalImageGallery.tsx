import { useState } from "react";
import { cn } from "@/lib/utils";

interface LocalImageGalleryProps {
  objectId: string;
  alt: string;
  className?: string;
}

const IMAGE_PATHS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

export function LocalImageGallery({ objectId, alt, className }: LocalImageGalleryProps) {
  const [available, setAvailable] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);

  const markAvailable = (path: string) => {
    setAvailable((current) => (current.includes(path) ? current : [...current, path]));
  };

  const markFailed = (path: string) => {
    setFailed((current) => (current.includes(path) ? current : [...current, path]));
  };

  const active = available.filter((path) => !failed.includes(path));

  return (
    <div className={cn("min-w-0 max-w-full space-y-2", className)}>
      <div className="grid min-h-56 min-w-0 max-w-full gap-2 sm:min-h-72 sm:grid-cols-2">
        {active.length > 0 ? (
          active.map((path) => (
            <img
              key={path}
              src={`/messier/${objectId}/${path}.jpg`}
              alt={alt}
              className="h-full min-h-56 w-full max-w-full rounded-md object-contain sm:min-h-72"
              onError={() => markFailed(path)}
            />
          ))
        ) : (
          <div className="col-span-full flex min-h-56 items-center justify-center rounded-md border border-border/70 bg-secondary/30 text-center sm:min-h-72">
            <div>
              <p className="font-display text-base">Picture not found</p>
              <p className="mt-1 text-xs text-muted-foreground">Image will be added later.</p>
            </div>
          </div>
        )}
      </div>
      {IMAGE_PATHS.map((path) =>
        available.includes(path) || failed.includes(path) ? null : (
          <img
            key={path}
            src={`/messier/${objectId}/${path}.jpg`}
            alt=""
            aria-hidden="true"
            className="hidden"
            onLoad={() => markAvailable(path)}
            onError={() => markFailed(path)}
          />
        ),
      )}
    </div>
  );
}