import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const DailyStatSchema = new Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
    views: { type: Number, default: 0 },
    uniques: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    totalDurationSeconds: { type: Number, default: 0 },
    byPath: {
      type: [
        {
          _id: false,
          path: String,
          views: Number,
          uniques: Number,
          totalDuration: Number,
        },
      ],
      default: [],
    },
    byReferrer: { type: [{ _id: false, referrer: String, count: Number }], default: [] },
    byDevice: {
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
      desktop: { type: Number, default: 0 },
    },
    byCountry: { type: [{ _id: false, country: String, count: Number }], default: [] },
    clicks: { type: [{ _id: false, label: String, count: Number }], default: [] },

    /**
     * Core Web Vitals, stored as p75 — the percentile Core Web Vitals is
     * actually scored against, not the mean. `samples` is kept so a day with
     * three visitors is not mistaken for a trend.
     */
    vitals: {
      type: [
        {
          _id: false,
          name: String,
          p75: Number,
          samples: Number,
          good: Number,
          needsImprovement: Number,
          poor: Number,
        },
      ],
      default: [],
    },
  },
  { versionKey: false },
);

export type DailyStatDoc = InferSchemaType<typeof DailyStatSchema>;

export const DailyStat: Model<DailyStatDoc> =
  (models.DailyStat as Model<DailyStatDoc>) ?? model<DailyStatDoc>("DailyStat", DailyStatSchema);

export default DailyStat;
