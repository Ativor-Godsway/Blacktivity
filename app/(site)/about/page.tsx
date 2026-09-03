import type { Metadata } from "next";
import PageHeader from "@/components/site/PageHeader";
import MonoLabel from "@/components/ui/MonoLabel";
import { ButtonLink } from "@/components/ui/Button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: SITE.description,
  alternates: { canonical: "/about" },
};

const FACTS = [
  ["Founded", "2025"],
  ["Based", "Accra, Ghana"],
  ["Discipline", "Publishing, image-making, events"],
  ["Edition", SITE.edition],
];

export default function AboutPage() {
  return (
    <>
      <PageHeader label="Studio" lines={["A room", "of our own."]} />

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-20">
        <div className="grid grid-cols-4 gap-x-(--gutter) gap-y-14 md:grid-cols-12">
          <aside className="col-span-4 md:col-span-3">
            <dl className="border-t border-rule">
              {FACTS.map(([term, value]) => (
                <div key={term} className="border-b border-rule py-4">
                  <dt className="mono text-fg-dim">{term}</dt>
                  <dd className="mono mt-2 text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <div className="prose-editorial col-span-4 md:col-span-7 md:col-start-5">
            <p className="dropcap">
              Blacktivity began in 2025 as a way of holding onto things that were
              otherwise passing through — a shoot on a Tuesday afternoon, a
              conversation in the back of a studio in Osu, a designer&apos;s third
              rejected cover that was better than the one that ran. We started
              publishing because the work deserved a record.
            </p>
            <p>
              We are a creative studio first: we make images, we art-direct, we put
              on nights where people who make things can stand in the same room. The
              publication grew out of that, not the other way around. Every article
              here comes from someone we have worked with, drunk with, or argued with
              about typography.
            </p>
            <blockquote>Your creativity belongs in the room.</blockquote>
            <p>
              That line is the whole brief. Accra is full of photographers,
              stylists, producers and writers whose work never reaches an audience
              because there is no shelf to put it on. We are building the shelf. The
              submissions page is open, permanently, to anyone doing the work.
            </p>
            <p>
              What comes next is an entertainment house — artists, releases, the
              longer game. For now, this is a publication, and it is edited with
              care.
            </p>
          </div>
        </div>

        <div className="mt-(--spacing-section) border-t border-rule pt-14">
          <MonoLabel dim>Get involved</MonoLabel>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/submit" data-track="about-submit">
              Submit your work ↗
            </ButtonLink>
            <ButtonLink href="/articles" variant="outline">
              Read the archive
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  );
}
