import Link from "next/link";
import ScrollReveal from "@/components/motion/ScrollReveal";
import MonoLabel from "@/components/ui/MonoLabel";

/**
 * The first half of the continuous black base at the foot of the page — the
 * footer sits directly beneath with no light section between them.
 */
export function SubmitCTA() {
  return (
    <section data-surface="dark" className="on-espresso mt-(--spacing-section-lg) pt-28 pb-24 md:pt-44 md:pb-32">
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        <MonoLabel className="text-fg-muted">#IGotBlacktivity</MonoLabel>

        <ScrollReveal
          as="h2"
          text="Send us what you're making."
          className="display mt-10 block max-w-[14ch] text-[clamp(2.5rem,9vw,7.5rem)] text-fg"
        />

        <p className="mt-10 max-w-[44ch] text-fg-muted">
          Photography, design, music, fashion, film, writing. No agency, no
          gatekeeping — a person reads every submission.
        </p>

        <Link
          href="/submit"
          data-track="home-submit-cta"
          className="mono mt-14 inline-flex items-center gap-3 border border-fg bg-fg px-8 py-5 text-bg transition-colors duration-300 ease-[var(--ease-expo)] hover:bg-transparent hover:text-fg"
        >
          Submit your work ↗
        </Link>
      </div>
    </section>
  );
}

export default SubmitCTA;
