/**
 * Single-page, keyboard-driven temporal narrative (space = advance, r = reset,
 * 1/2/3 = jump between cases). Renders baked fixtures for Cases A/B and runs Case C
 * live through /api/run. Built in build-order steps 3+ — see docs/design/build-plan.md.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Consilium</h1>
        <p className="mt-2 text-neutral-500">The chart proposes, the room disposes.</p>
        <p className="mt-6 text-sm text-neutral-400">Skeleton — pipeline & stage UI to come.</p>
      </div>
    </main>
  );
}
