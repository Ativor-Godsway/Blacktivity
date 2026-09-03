import type { Metadata } from "next";
import PageHeader from "@/components/site/PageHeader";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import Reveal from "@/components/motion/Reveal";
import { TEAM } from "@/data/team";
import { getApprovedSubmissions } from "@/lib/queries";
import { pad2 } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Creatives",
  description: "The Blacktivity roster, and the work sent in by the community.",
  alternates: { canonical: "/creatives" },
};

export default async function CreativesPage() {
  const approved = await getApprovedSubmissions(24);

  return (
    <>
      <PageHeader
        label="Roster"
        lines={["The people", "in the room."]}
        intro="A small studio. Photographers, stylists, editors and producers who make the work happen."
      />

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-20">
        <ul className="grid grid-cols-4 gap-x-(--gutter) gap-y-16 md:grid-cols-12">
          {TEAM.map((member, i) => (
            <Reveal
              key={member.igHandle}
              as="li"
              delay={(i % 3) * 0.05}
              className="group col-span-2 md:col-span-4"
            >
                <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-3">
                  <MonoLabel dim>
                    {pad2(i + 1)} / {pad2(TEAM.length)}
                  </MonoLabel>
                  <MonoLabel>{member.role}</MonoLabel>
                </div>

                <RevealImage
                  src={member.photo}
                  alt={`${member.name}, ${member.role}`}
                  width={1200}
                  height={1600}
                  sizes="(max-width: 768px) 50vw, 30vw"
                  colorOnView={false}
                  className="aspect-3/4 w-full"
                />

                <h2 className="display mt-5 text-[clamp(1.5rem,2.5vw,2.25rem)]">
                  {member.name}
                </h2>
                {member.bio ? (
                  <p className="mt-3 max-w-[42ch] text-fg-muted">{member.bio}</p>
                ) : null}

                <a
                  href={`https://instagram.com/${member.igHandle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-track="creative-instagram"
                  className="mono mt-4 inline-block text-fg-muted transition-colors duration-300 hover:text-fg"
                >
                  @{member.igHandle} ↗
                </a>
            </Reveal>
          ))}
        </ul>

        {approved.length > 0 ? (
          <section className="mt-(--spacing-section-lg)">
            <div className="flex items-baseline justify-between border-b border-rule pb-4">
              <MonoLabel>#IGotBlacktivity</MonoLabel>
              <MonoLabel dim>From the community</MonoLabel>
            </div>

            <ul className="mt-14 grid grid-cols-4 gap-x-(--gutter) gap-y-14 md:grid-cols-12">
              {approved.map((sub) => (
                <li key={sub.id} className="col-span-2 md:col-span-3">
                  {sub.image?.url ? (
                    <RevealImage
                      src={sub.image.url}
                      alt={`Work by ${sub.name}`}
                      width={1200}
                      height={1600}
                      sizes="(max-width: 768px) 50vw, 22vw"
                      className="aspect-3/4 w-full"
                    />
                  ) : (
                    <div className="flex aspect-3/4 w-full items-center justify-center border border-rule">
                      <MonoLabel dim>{sub.discipline}</MonoLabel>
                    </div>
                  )}

                  <p className="mt-4 text-sm">{sub.name}</p>
                  <MonoLabel dim className="mt-1 block">
                    {sub.discipline}
                  </MonoLabel>
                  {sub.note ? (
                    <p className="mt-2 max-w-[38ch] text-sm text-fg-dim">{sub.note}</p>
                  ) : null}
                  {sub.workUrl ? (
                    <a
                      href={sub.workUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mono mt-3 inline-block text-fg-muted hover:text-fg"
                    >
                      View work ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
