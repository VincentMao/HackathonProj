/** Subtle footer legend for the keyboard controls that drive the whole demo. */
const KEYS: { keys: string[]; label: string }[] = [
  { keys: ["Space", "→"], label: "Advance" },
  { keys: ["←", "⌫"], label: "Back" },
  { keys: ["R"], label: "Reset" },
  { keys: ["1", "2", "3"], label: "Case A / B / C" },
];

export default function KeyboardLegend() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200 py-4 text-sm text-slate-500">
      {KEYS.map((k) => (
        <span key={k.label} className="inline-flex items-center gap-2">
          <span className="inline-flex gap-1">
            {k.keys.map((key) => (
              <kbd
                key={key}
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-600 shadow-sm"
              >
                {key}
              </kbd>
            ))}
          </span>
          <span>{k.label}</span>
        </span>
      ))}
    </footer>
  );
}
