import MonoLabel from "@/components/ui/MonoLabel";

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="border border-rule p-5">
      <MonoLabel dim>{label}</MonoLabel>
      <p className="display mt-4 text-[clamp(2rem,4vw,3rem)] tabular-nums">{value}</p>
      {detail ? <MonoLabel dim className="mt-2 block">{detail}</MonoLabel> : null}
    </div>
  );
}

export default StatTile;
