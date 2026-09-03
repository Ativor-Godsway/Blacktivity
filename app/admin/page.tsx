import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";
import StatTile from "@/components/admin/StatTile";
import Panel from "@/components/admin/Panel";
import RangePicker from "@/components/admin/RangePicker";
import LineChart from "@/components/admin/charts/LineChart";
import BarList from "@/components/admin/charts/BarList";
import VitalsPanel from "@/components/admin/VitalsPanel";
import MonoLabel from "@/components/ui/MonoLabel";
import { getDashboardData, type RangeDays } from "@/lib/analytics-queries";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function parseRange(value: string | undefined): RangeDays {
  const n = Number(value);
  return n === 7 || n === 30 || n === 90 ? n : 30;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function shortDate(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}.${m}`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);

  const data = await getDashboardData(range);

  const deviceTotal =
    data.devices.mobile + data.devices.tablet + data.devices.desktop || 1;

  const changeLabel =
    data.totals.viewsChangePct === null
      ? "No prior period"
      : `${data.totals.viewsChangePct >= 0 ? "+" : ""}${data.totals.viewsChangePct}% vs previous ${range}d`;

  return (
    <AdminShell
      name={session?.name ?? "Admin"}
      title="Dashboard"
      actions={<RangePicker active={range} />}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile
          label="Pageviews"
          value={data.totals.views.toLocaleString()}
          detail={changeLabel}
        />
        <StatTile
          label="Visitors"
          value={data.totals.uniques.toLocaleString()}
          detail={`${data.totals.sessions.toLocaleString()} sessions`}
        />
        <StatTile
          label="Avg. time on page"
          value={formatDuration(data.totals.avgSecondsOnPage)}
          detail="Visible tab only"
        />
        <StatTile
          label="Today"
          value={data.today.views.toLocaleString()}
          detail={`${data.today.uniques.toLocaleString()} visitors · live`}
        />
        <StatTile
          label="Mobile share"
          value={`${Math.round((data.devices.mobile / deviceTotal) * 100)}%`}
          detail="Of all pageviews"
        />
      </div>

      <div className="mt-6">
        <Panel title="Traffic" note={`Last ${range} days`}>
          <LineChart
            labels={data.series.map((p) => shortDate(p.date))}
            series={[
              { label: "Pageviews", values: data.series.map((p) => p.views), variant: "primary" },
              { label: "Visitors", values: data.series.map((p) => p.uniques), variant: "secondary" },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Top pages" note="Views · avg. time">
          <BarList
            rows={data.topPaths.map((p) => ({ label: p.path, value: p.views }))}
            secondary={(row) => {
              const match = data.topPaths.find((p) => p.path === row.label);
              return match ? formatDuration(match.avgSeconds) : "";
            }}
          />
        </Panel>

        <Panel title="Core Web Vitals" note="p75 · real readers">
          <VitalsPanel vitals={data.vitals} />
        </Panel>

        <Panel title="Referrers" note="Where readers arrive from">
          <BarList
            rows={data.referrers.map((r) => ({
              label: r.referrer || "Direct / none",
              value: r.count,
            }))}
          />
        </Panel>

        <Panel title="Devices">
          <BarList
            rows={[
              { label: "Mobile", value: data.devices.mobile },
              { label: "Desktop", value: data.devices.desktop },
              { label: "Tablet", value: data.devices.tablet },
            ]}
            secondary={(row) => `${Math.round((row.value / deviceTotal) * 100)}%`}
          />
        </Panel>

        <Panel title="Countries">
          <BarList rows={data.countries.map((c) => ({ label: c.country, value: c.count }))} />
        </Panel>

        <Panel title="Tracked clicks" note="data-track labels" >
          <BarList
            rows={data.clicks.map((c) => ({ label: c.label, value: c.count }))}
            emptyLabel="No tracked clicks in this range."
          />
        </Panel>

        <Panel title="How this works">
          <div className="flex flex-col gap-4 text-sm leading-relaxed text-fg-muted">
            <p>
              Raw events expire automatically after 90 days. A nightly cron job at
              02:00 UTC rolls each day into a single summary document, which is
              what these charts read — so the dashboard stays fast no matter how
              much traffic the site takes.
            </p>
            <p>
              Visitors are counted with a daily-rotating hash of IP and browser.
              No raw IP address is ever stored and nobody can be tracked across
              days, which is why there is no cookie banner.
            </p>
            <MonoLabel dim>Today&apos;s figures are computed live.</MonoLabel>
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
