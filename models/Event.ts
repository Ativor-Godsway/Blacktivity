import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PosterSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    alt: { type: String, default: "" },
    width: { type: Number, default: 1200 },
    height: { type: Number, default: 1600 },
  },
  { _id: false },
);

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    poster: { type: PosterSchema, required: true },
    // upcoming vs past is always derived from startDate, never stored.
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    venue: { type: String, required: true },
    city: { type: String, default: "Accra" },
    ticketUrl: { type: String, default: "" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type EventDoc = InferSchemaType<typeof EventSchema>;

export const EventModel: Model<EventDoc> =
  (models.Event as Model<EventDoc>) ?? model<EventDoc>("Event", EventSchema);

export default EventModel;
