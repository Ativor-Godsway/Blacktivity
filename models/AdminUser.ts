import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Admin" },
    // Any session token issued before this is rejected server-side — set on
    // every password change so other signed-in devices are signed out.
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema>;

export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) ?? model<AdminUserDoc>("AdminUser", AdminUserSchema);

export default AdminUser;
