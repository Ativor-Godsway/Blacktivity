import ScrollReveal from "@/components/motion/ScrollReveal";
import TextType from "@/components/motion/TextType";
import MonoLabel from "@/components/ui/MonoLabel";
import ActionLink from "@/components/site/ActionLink";

/**
 * Full-bleed black. Its job is rhythm and orientation, not exposition — the
 * lead line, two or three sentences, and a way through to /about. The black
 * break is doing structural work in the page, which is why the treatment stays
 * even though the content changed.
 */
export function AboutSection() {
  return (
    <section className="on-void py-28 md:py-44">
      <div className="mx-auto max-w-[1600px] px-(--gutter)">
        <MonoLabel className="text-fg-muted">
          <TextType text="Who we are" />
        </MonoLabel>

        {/* Short display text — the only place ScrollReveal is permitted. */}
        <ScrollReveal
          as="h2"
          text="Your creativity belongs in the room."
          className="display mt-10 block max-w-[18ch] text-[clamp(2.25rem,7vw,6rem)] text-fg"
        />

        <p className="mt-12 max-w-[56ch] text-lg text-fg-muted">
          Blacktivity is a creative studio and publication in Accra, founded in
          2025. We make images, we art-direct, and we put on nights where people
          who make things stand in the same room. The publication grew out of
          that, not the other way around.
        </p>

        <div className="mt-12">
          <ActionLink href="/about">More about us</ActionLink>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
