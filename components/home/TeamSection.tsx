import Link from "next/link";
import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import Reveal from "@/components/motion/Reveal";
import DrawLink from "@/components/site/DrawLink";
import { TEAM } from "@/data/team";
import { cn } from "@/lib/utils";

/** Staggered vertical alignment so the roster never reads as a flat row. */
const DROP = ["", "md:mt-16", "md:mt-6", "md:mt-24", "md:mt-2", "md:mt-20"];

export function TeamSection() {
  return (
    <section className="mt-(--spacing-section-lg)">
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        <div className="flex items-baseline justify-between border-b border-rule pb-4">
          <MonoLabel>The team</MonoLabel>
          <DrawLink href="/creatives">Full roster ↗</DrawLink>
        </div>

        <ul className="mt-16 grid grid-cols-2 gap-x-(--gutter) gap-y-14 md:grid-cols-6">
          {TEAM.map((member, i) => (
            <Reveal
              key={member.igHandle}
              as="li"
              delay={(i % 3) * 0.05}
              className={cn("group", DROP[i % DROP.length])}
            >
                <a
                  href={`https://instagram.com/${member.igHandle}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-track="creative-instagram"
                  className="block"
                >
                  <RevealImage
                    src={member.photo}
                    alt={`${member.name}, ${member.role}`}
                    width={1200}
                    height={1600}
                    sizes="(max-width: 768px) 50vw, 16vw"
                    colorOnView={false}
                    className="aspect-3/4 w-full"
                  />

                  <p className="mt-4 font-medium">{member.name}</p>
                  <MonoLabel className="mt-1 block text-fg-muted">{member.role}</MonoLabel>
                  <MonoLabel className="mt-1 block opacity-0 transition-opacity duration-300 ease-[var(--ease-expo)] group-hover:opacity-100 group-focus-within:opacity-100">
                    @{member.igHandle}
                  </MonoLabel>
                </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default TeamSection;
