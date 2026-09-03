import { redirect } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import Card, { Empty } from "@/components/admin/ui/Card";
import StatTile from "@/components/admin/ui/StatTile";
import NeedsAttention from "@/components/admin/NeedsAttention";
import RangePicker from "@/components/admin/RangePicker";
import AreaChart from "@/components/admin/charts/AreaChart";
import RankedBars from "@/components/admin/charts/RankedBars";
import CategorySplit from "@/components/admin/charts/CategorySplit";
import TopArticlesTable from "@/components/admin/TopArticlesTable";
import VitalsPanel from "@/components/admin/VitalsPanel";
import { getSession } from "@/lib/session";
import { getAdminContext } from "@/lib/admin-context";
import { getDashboardData, type RangeDays } from "@/lib/analytics-queries";
import { getNeedsAttention, titlesForPaths } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

const RANGES: RangeDays[] = [7, 30, 90];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { range: rawRange } = await searchParams;
  const parsed = Number(rawRange);
  const range: RangeDays = RANGES.includes(parsed as RangeDays) ? (parsed as RangeDays) : 30;

  const [ctx, data, queue] = await Promise.all([
    getAdminContext(),
    getDashboardData(range),
    getNeedsAttention(),
  ]);

  const titles = await titlesForPaths(data.topPaths.map((p) => p.path));

  const articleRows = data.topPaths
    .filter((p) => p.path.startsWith("/articles/"))
    .slice(0, 8)
    .map((p) => ({
      path: p.path,
      title: titles.get(p.path)?.title ?? p.path.replace("/articles/", ""),
      views: p.views,
      avgSeconds: p.avgSeconds,
      published: titles.get(p.path)?.published ?? null,
    }));

  const mmss = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
  const viewSeries = data.series.map((d) => d.views);

  return (
    <AdminShell
      {...ctx}
      title="Dashboard"
      subtitle="What needs you, then how the last few weeks have gone."
      actions={
        <>
          <Link href="/admin/articles/new" className="a-btn a-btn-primary">
            New article
          </Link>
          <Link href="/" className="a-btn a-btn-ghost">
            View site ↗
          </Link>
        </>
      }
      railTitle="Today"
      rail={
        <div className="flex flex-col gap-5">
          <div>
            <p className="a-meta">Views today</p>
            <p className="a-num mt-1 text-[26px] leading-none font-medium">
              {data.today.views.toLocaleString()}
            </p>
            <p className="a-muted mt-1 text-[12px]">
              {data.today.uniques.toLocaleString()} unique visitors
            </p>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--admin-rule)" }}>
            <p className="a-meta mb-3">Tracked clicks</p>
            <RankedBars
              rows={data.clicks.slice(0, 5).map((c) => ({ label: c.label, value: c.count }))}
              emptyLabel="No tracked clicks in this range."
            />
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--admin-rule)" }}>
            <p className="a-meta mb-3">Where readers are</p>
            <RankedBars
              rows={data.countries.slice(0, 5).map((c) => ({ label: c.country, value: c.count }))}
              emptyLabel="No country data yet."
            />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Card title="Needs attention" note={queue.length ? `${queue.length} items` : undefined} padded={false}>
          <NeedsAttention items={queue} />
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Pageviews"
            value={data.totals.views.toLocaleString()}
            deltaPct={data.totals.viewsChangePct}
            note={`last ${range} days`}
            series={viewSeries}
          />
          <StatTile
            label="Unique visitors"
            value={data.totals.uniques.toLocaleString()}
            note={`${data.totals.sessions.toLocaleString()} sessions`}
            series={data.series.map((d) => d.uniques)}
          />
          <StatTile
            label="Avg. time on page"
            value={mmss(data.totals.avgSecondsOnPage)}
            note="visible tab only"
          />
          <StatTile
            label="Pending submissions"
            value={String(ctx.pendingCount)}
            note={ctx.pendingCount === 0 ? "queue clear" : "awaiting review"}
          />
        </div>

        <Card
          title="Visitors over time"
          note={`Pageviews, last ${range} days`}
          action={<RangePicker value={range} />}
        >
          {data.series.length > 1 ? (
            <AreaChart
              points={data.series.map((d) => ({
                // "2026-09-03" -> "3 Sep", which is what the axis and tooltip want.
                label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                value: d.views,
              }))}
              valueLabel="pageviews"
            />
          ) : (
            <Empty title="Not enough data yet" body="The chart appears once there are at least two days of traffic." />
          )}
        </Card>

        <Card title="Top articles" note={`Last ${range} days`} padded={false}>
          <div className="px-5 pt-4 pb-1">
            <TopArticlesTable rows={articleRows} />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Referrers" note="Where readers arrive from">
            <RankedBars
              rows={data.referrers.slice(0, 6).map((r) => ({
                label: r.referrer || "Direct / none",
                value: r.count,
              }))}
              emptyLabel="No referrers recorded yet."
            />
          </Card>

          <Card title="Device split" note="Share of pageviews">
            <CategorySplit
              rows={[
                { label: "Mobile", value: data.devices.mobile },
                { label: "Desktop", value: data.devices.desktop },
                { label: "Tablet", value: data.devices.tablet },
              ]}
            />
          </Card>
        </div>

        <Card title="Core Web Vitals" note="p75 · real readers">
          <VitalsPanel vitals={data.vitals} />
        </Card>
      </div>
    </AdminShell>
  );
}
