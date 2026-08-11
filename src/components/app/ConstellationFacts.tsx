import { importantStars, starLabel } from "@/lib/astro/catalog";
import type { Constellation } from "@/lib/astro/types";

/** The educational payload shown identically at every difficulty after answering. */
export function ConstellationFacts({ constellation }: { constellation: Constellation }) {
  const keyStars = importantStars(constellation);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-2xl font-semibold tracking-wide">
          {constellation.name.toUpperCase()}
        </h3>
        <p className="text-sm text-primary">{constellation.figure}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="label-caps">Abbreviation</dt>
          <dd className="font-mono">{constellation.abbreviation}</dd>
        </div>
        <div>
          <dt className="label-caps">Best observed</dt>
          <dd>{constellation.bestSeason} evenings</dd>
        </div>
        <div>
          <dt className="label-caps">Region</dt>
          <dd>
            {constellation.region}
            {constellation.isEcliptic ? " · Ecliptic" : ""}
          </dd>
        </div>
        <div>
          <dt className="label-caps">Centre</dt>
          <dd className="font-mono text-xs">
            {(constellation.centerRa / 15).toFixed(1)}h {constellation.centerDec.toFixed(0)}°
          </dd>
        </div>
      </dl>

      {keyStars.length > 0 && (
        <div>
          <p className="label-caps">Key stars</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {keyStars.map((s) => (
              <li
                key={s.id}
                className="rounded border border-border/80 bg-secondary/50 px-2 py-1 text-xs"
              >
                {starLabel(s)}{" "}
                <span className="font-mono text-[10px] text-muted-foreground">
                  m{s.magnitude.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="label-caps">Description</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {constellation.description}
        </p>
      </div>
    </div>
  );
}