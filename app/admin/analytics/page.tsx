import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Card, { Empty } from "@/components/admin/ui/Card";
import RangePicker from "@/components/admin/RangePicker";
import AreaChart from "@/components/admin/charts/AreaChart";
import RankedBars from "@/components/admin/charts/RankedBars";
import CategorySplit from "@/components/admin/charts/CategorySplit";
import TopArticlesTable from "@/components/admin/TopArticlesTable";
import VitalsPanel from "@/components/admin/VitalsPanel";
import { getSession } from "@/lib/session";
import { getAdminContext } from "@/lib/admin-context";
import { getDashboardData, type RangeDays } from "@/lib/analytics-queries";
import { titlesForPaths } from "@/lib/admin-queries";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const RANGES: RangeDays[] = [7, 30, 90];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { range: rawRange } = await searchParams;
  const parsed = Number(rawRange);
  const range: RangeDays = RANGES.includes(parsed as RangeDays) ? (parsed as RangeDays) : 30;

  const [ctx, data] = await Promise.all([getAdminContext(), getDashboardData(range)]);
  const titles = await titlesForPaths(data.topPaths.map((p) => p.path));

  const articleRows = data.topPaths
    .filter((p) => p.path.startsWith("/articles/"))
    .slice(0, 12)
    .map((p) => ({
      path: p.path,
      title: titles.get(p.path)?.title ?? p.path.replace("/articles/", ""),
      views: p.views,
      avgSeconds: p.avgSeconds,
      published: titles.get(p.path)?.published ?? null,
    }));

  // A fourth category is not a fourth hue — the tail folds into "Other".
  const topCountries = data.countries.slice(0, 2);
  const otherCountries = data.countries.slice(2).reduce((a, c) => a + c.count, 0);
  const countryRows = [
    ...topCountries.map((c) => ({ label: c.country, value: c.count })),
    ...(otherCountries > 0 ? [{ label: "Other", value: otherCountries }] : []),
  ];

  return (
    <AdminShell
      {...ctx}
      title="Analytics"
      subtitle="First-party, no third-party script. Raw events expire after 90 days."
      actions={<RangePicker value={range} />}
    >
      <div className="flex flex-col gap-6">
        <Card title="Pageviews over time" note={`Last ${range} days`}>
          {data.series.length > 1 ? (
            <AreaChart
              points={data.series.map((d) => ({
                label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                value: d.views,
              }))}
              valueLabel="pageviews"
            />
          ) : (
            <Empty title="Not enough data yet" body="The chart appears once there are at least two days of traffic." />
          )}
        </Card>

        <Card title="Unique visitors over time" note={`Last ${range} days`}>
          {data.series.length > 1 ? (
            <AreaChart
              points={data.series.map((d) => ({
                label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                value: d.uniques,
              }))}
              valueLabel="visitors"
            />
          ) : (
            <Empty title="Not enough data yet" />
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
              rows={data.referrers.slice(0, 8).map((r) => ({
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

          <Card title="Countries" note="Top two, then the tail">
            <CategorySplit rows={countryRows} emptyLabel="No country data yet." />
          </Card>

          <Card title="Tracked clicks" note="data-track labels">
            <RankedBars
              rows={data.clicks.slice(0, 8).map((c) => ({ label: c.label, value: c.count }))}
              emptyLabel="No tracked clicks in this range."
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
