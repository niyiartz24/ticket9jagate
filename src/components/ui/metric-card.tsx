export function MetricCard({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "warning" | "danger" }) {
  const valueColor =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-gate-text";

  return (
    <div className="rounded-xl border border-gate-border bg-gate-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gate-textMuted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
