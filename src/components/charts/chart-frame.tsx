export function ChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tm-panel">
      <h2 className="tm-panel-title text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="tm-panel-caption mt-1 text-sm">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
