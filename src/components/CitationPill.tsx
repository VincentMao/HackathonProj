/** A small citation id pill (e.g. ZUMA-7, EPCORE-NHL-2). */
export default function CitationPill({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
      {id}
    </span>
  );
}
