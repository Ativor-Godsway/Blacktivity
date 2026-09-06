import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A track is a FIRST-CLASS DOCUMENT, not a subdocument of a volume.
 *
 * Movement, weeks-on-chart and peak position all require a song to keep the
 * same identity across volumes. Embedding a copy inside each volume makes that
 * impossible — the same song would appear twice in the archive with two
 * separate histories. `slug` is the dedupe key and the admin reuses an existing
 * document rather than creating a second one.
 */
const ArtworkSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    alt: { type: String, default: "" },
    width: { type: Number, default: 400 },
    height: { type: Number, default: 400 },
    blurDataURL: { type: String, default: "" },
  },
  { _id: false },
);

/** All optional, all external. Order here is not the render order — see PLATFORMS. */
const LinksSchema = new Schema(
  {
    audiomack: { type: String, default: "" },
    youtube: { type: String, default: "" },
    spotify: { type: String, default: "" },
    boomplay: { type: String, default: "" },
    appleMusic: { type: String, default: "" },
    soundcloud: { type: String, default: "" },
  },
  { _id: false },
);

const TrackSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    featuring: { type: [String], default: [] },
    slug: { type: String, required: true, unique: true, index: true },
    artwork: { type: ArtworkSchema, required: true },
    releaseDate: { type: Date, required: true, index: true },
    origin: { type: String, default: "" },
    links: { type: LinksSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type TrackDoc = InferSchemaType<typeof TrackSchema>;

export const Track: Model<TrackDoc> =
  (models.Track as Model<TrackDoc>) ?? model<TrackDoc>("Track", TrackSchema);

export default Track;
