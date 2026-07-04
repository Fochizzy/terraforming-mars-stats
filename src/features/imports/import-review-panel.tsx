export function ImportReviewPanel() {
  return (
    <section className="rounded-2xl border border-orange-900/30 bg-black/25 p-4">
      <h2 className="font-serif text-xl font-semibold">Import Review</h2>
      <p className="mt-2 text-sm text-stone-300">
        This workflow is set up for pasted logs, screenshot evidence, alias
        matching, and parser review before the final scoring pass.
      </p>
      <ul className="mt-4 grid gap-2 text-sm text-stone-200">
        <li>Declared setup data is captured first so the scoring wizard starts in the right shape.</li>
        <li>Imported evidence is now stored with the draft so the shared log flow can reopen it later.</li>
        <li>Player alias normalization is ready for matching imported names to saved profiles.</li>
      </ul>
    </section>
  );
}
