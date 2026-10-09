import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Home" },
  { to: "/practice", label: "Practice" },
  { to: "/constellations", label: "Constellations" },
  { to: "/asterisms", label: "Asterisms" },
  { to: "/messier", label: "Messier" },
  { to: "/sky-map", label: "Sky Map" },
  { to: "/progress", label: "Progress" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-card/60 px-2.5 py-2 text-foreground shadow-sm"
        >
          <span className="inline-flex size-2.5 rounded-full bg-primary shadow-[0_0_16px_rgba(133,180,255,0.9)]" />
          <span className="font-display text-[0.68rem] font-semibold tracking-[0.22em] sm:text-[0.74rem]">
            ASTRO<span className="text-primary">TRAINER</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto px-1 py-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-secondary/70 hover:text-foreground"
              activeProps={{
                className:
                  "bg-secondary text-foreground shadow-sm ring-1 ring-border/70 shadow-[0_8px_18px_rgba(15,23,42,0.18)]",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
