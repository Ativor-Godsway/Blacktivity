import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ANALYTICS_TTL_SECONDS = 7_776_000; // 90 days

const AnalyticsEventSchema = new Schema(
  {
    type: { type: String, enum: ["pageview", "heartbeat", "click", "vital"], required: true },
    sessionId: { type: String, required: true },
    visitorHash: { type: String, required: true }, // sha256(ip + ua + daily salt)
    path: { type: String, required: true },
    referrer: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} }, // { label } | { seconds } | { name, value, rating }
    device: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
    country: { type: String, default: "" },
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// Raw events self-expire so the collection can never grow without bound.
AnalyticsEventSchema.index({ ts: 1 }, { expireAfterSeconds: ANALYTICS_TTL_SECONDS });
AnalyticsEventSchema.index({ ts: 1, path: 1 });

export type AnalyticsEventDoc = InferSchemaType<typeof AnalyticsEventSchema>;

export const AnalyticsEvent: Model<AnalyticsEventDoc> =
  (models.AnalyticsEvent as Model<AnalyticsEventDoc>) ??
  model<AnalyticsEventDoc>("AnalyticsEvent", AnalyticsEventSchema);

export default AnalyticsEvent;
