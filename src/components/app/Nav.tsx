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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="font-display text-sm font-semibold tracking-[0.22em] text-foreground"
        >
          ASTRO<span className="text-primary">TRAINER</span>
        </Link>
        <nav className="ml-auto flex items-center gap-0.5 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:px-3"
              activeProps={{ className: "text-foreground bg-secondary/70" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
