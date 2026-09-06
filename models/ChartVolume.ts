import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * `previousPosition` is NEVER stored. Movement is derived from the most recent
 * published volume with a lower `number`, exactly as upcoming/past is derived
 * from Event.startDate. Storing it creates a second source of truth that drifts
 * the first time an older volume is edited after publishing.
 */
const NewMusicEntry = new Schema(
  {
    track: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    note: { type: String, default: "", maxlength: 120 },
  },
  { _id: false },
);

const ChartEntry = new Schema(
  {
    track: { type: Schema.Types.ObjectId, ref: "Track", required: true },
    position: { type: Number, required: true, min: 1, max: 10 },
    note: { type: String, default: "", maxlength: 120 },
  },
  { _id: false },
);

const PlaylistSet = new Schema(
  {
    spotify: { type: String, default: "" },
    audiomack: { type: String, default: "" },
    youtube: { type: String, default: "" },
  },
  { _id: false },
);

const CuratorSchema = new Schema(
  {
    name: { type: String, default: "" },
    igHandle: { type: String, default: "" },
    discipline: { type: String, default: "" },
    photo: {
      type: new Schema(
        {
          url: { type: String, default: "" },
          publicId: { type: String, default: "" },
          alt: { type: String, default: "" },
          width: { type: Number, default: 1000 },
          height: { type: Number, default: 1250 },
          blurDataURL: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: null,
    },
    statement: { type: String, default: "", maxlength: 400 },
  },
  { _id: false },
);

const ChartVolumeSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, default: null },
    intro: { type: String, default: "", maxlength: 240 },
    coverImage: {
      type: new Schema(
        {
          url: { type: String, default: "" },
          publicId: { type: String, default: "" },
          alt: { type: String, default: "" },
          width: { type: Number, default: 1200 },
          height: { type: Number, default: 1200 },
          blurDataURL: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: null,
    },

    newMusic: { type: [NewMusicEntry], default: [] },
    chart: { type: [ChartEntry], default: [] },

    // Omitted entirely when a volume publishes without one — there is no
    // "curator TBA" state.
    curation: {
      type: new Schema({ curator: CuratorSchema, tracks: { type: [NewMusicEntry], default: [] } }, { _id: false }),
      default: null,
    },

    playlists: {
      newMusic: { type: PlaylistSet, default: () => ({}) },
      chart: { type: PlaylistSet, default: () => ({}) },
      curation: { type: PlaylistSet, default: () => ({}) },
    },
  },
  { timestamps: true },
);

export type ChartVolumeDoc = InferSchemaType<typeof ChartVolumeSchema>;

export const ChartVolume: Model<ChartVolumeDoc> =
  (models.ChartVolume as Model<ChartVolumeDoc>) ??
  model<ChartVolumeDoc>("ChartVolume", ChartVolumeSchema);

export default ChartVolume;
