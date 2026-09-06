import type { PlatformKey } from "@/lib/rotation";

/** What the editor needs to render a row. The full document lives server-side. */
export type TrackLite = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  featuring: string[];
  artwork: { url: string; width: number; height: number; alt: string; blurDataURL?: string } | null;
  releaseDate: string;
  origin: string;
  links: Partial<Record<PlatformKey, string>>;
};

export type EntryValue = { trackId: string; note: string };

export type VolumeFormValues = {
  number: number;
  status: "draft" | "published";
  publishedAt: string;
  intro: string;
  newMusic: EntryValue[];
  chart: EntryValue[];
  curation: {
    curator: {
      name: string;
      igHandle: string;
      discipline: string;
      statement: string;
      photo: TrackLite["artwork"];
    };
    tracks: EntryValue[];
  } | null;
  playlists: {
    newMusic: { spotify: string; audiomack: string; youtube: string };
    chart: { spotify: string; audiomack: string; youtube: string };
    curation: { spotify: string; audiomack: string; youtube: string };
  };
};
