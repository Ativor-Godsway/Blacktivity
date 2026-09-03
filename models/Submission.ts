import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { DISCIPLINES, SUBMISSION_STATUSES } from "@/lib/constants";

const SubmissionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    igHandle: { type: String, default: "", trim: true },
    discipline: { type: String, enum: DISCIPLINES, required: true },
    workUrl: { type: String, default: "" },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    note: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: SUBMISSION_STATUSES, default: "pending", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SubmissionSchema.index({ status: 1, createdAt: -1 });

export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema>;

export const Submission: Model<SubmissionDoc> =
  (models.Submission as Model<SubmissionDoc>) ?? model<SubmissionDoc>("Submission", SubmissionSchema);

export default Submission;
