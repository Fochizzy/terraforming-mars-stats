export function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
