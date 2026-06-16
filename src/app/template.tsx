/**
 * Route template — remounts on every navigation, so the `fade-in` replays and
 * page changes feel like soft transitions rather than hard reloads. CSS-only;
 * disabled under `prefers-reduced-motion` by the global reset.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
