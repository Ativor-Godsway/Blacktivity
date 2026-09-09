import RevealImage from "@/components/ui/RevealImage";
import MonoLabel from "@/components/ui/MonoLabel";
import ActionLink from "@/components/site/ActionLink";
import NewMusicList from "./NewMusicList";
import { curatorEventLabel, type VolumeDTO } from "@/lib/rotation";

/**
 * CREATORS CURATION — a short article, not a third list.
 *
 * The portrait is the section's only large image and, on the chart page which
 * carries no artwork at all, almost certainly its LCP element — hence
 * `priority`. 4:5 matches the portrait ratio used everywhere else on the site.
 *
 * A volume published without a curation omits this entirely. There is no
 * "curator TBA" state, by design.
 */
export function CurationBlock({
  curation,
  volumeSlug,
}: {
  curation: NonNullable<VolumeDTO["curation"]>;
  volumeSlug: string;
}) {
  const { curator, tracks } = curation;

  return (
    <div>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-(--gutter)">
        {curator.photo ? (
          <div className="md:col-span-5">
            <RevealImage
              src={curator.photo.url}
              alt={curator.photo.alt || curator.name}
              width={curator.photo.width}
              height={curator.photo.height}
              blurDataURL={curator.photo.blurDataURL}
              sizes="(max-width: 768px) 100vw, 40vw"
              /*
                `priority` REMOVED — Revision 17. It was justified when the
                chart carried no artwork and this was the page's only large
                image, but the page now opens on a text masthead and this sits
                two full sections below the fold. Preloading it was pulling
                176KB onto the critical path and it measured as the LCP element
                at 18.1s on a throttled phone.
              */
              className="aspect-4/5 w-full"
            />
          </div>
        ) : null}

        <div className={curator.photo ? "md:col-span-7" : "md:col-span-12"}>
          <blockquote className="display text-[clamp(1.75rem,3.4vw,2.75rem)] text-fg">
            “{curator.statement}”
          </blockquote>

          <div className="mt-8 border-t border-rule pt-5">
            <p className="display text-[clamp(1.5rem,2.6vw,2rem)] text-fg">{curator.name}</p>
            <p className="mono mt-2 flex flex-wrap items-center gap-x-3 text-fg-dim">
              {curator.igHandle ? (
                <a
                  href={`https://instagram.com/${curator.igHandle.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track={curatorEventLabel(curator.igHandle.replace(/^@/, ""))}
                  className="transition-colors duration-300 ease-[var(--ease-expo)] hover:text-fg"
                >
                  @{curator.igHandle.replace(/^@/, "")}
                  <span className="sr-only"> on Instagram (opens in a new tab)</span>
                </a>
              ) : null}
              {curator.discipline ? <span>· {curator.discipline}</span> : null}
            </p>
          </div>
        </div>
      </div>

      {tracks.length > 0 ? (
        <div className="mt-16">
          <MonoLabel dim>The playlist — {curator.name}&rsquo;s order</MonoLabel>
          <div className="mt-8">
            {/* The same card as everywhere else — §3.4. Unranked, so no
                numbers. */}
            <NewMusicList entries={tracks} />
          </div>
        </div>
      ) : null}

      {/* The community funnel, and deliberately the last thing on the page. */}
      <div className="mt-16 border-t border-rule pt-10">
        <p className="display text-[clamp(1.5rem,3vw,2.25rem)] text-fg">
          Want to curate a volume?
        </p>
        <ActionLink
          href="/submit"
          className="mt-6"
          data-track={`rotation:curate-cta:${volumeSlug}`}
        >
          Submit your work
        </ActionLink>
      </div>
    </div>
  );
}

export default CurationBlock;
