import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Admin" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema>;

export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) ?? model<AdminUserDoc>("AdminUser", AdminUserSchema);

export default AdminUser;
