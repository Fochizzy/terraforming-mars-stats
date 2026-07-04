export function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tm-panel">
      <h2 className="tm-panel-title text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
