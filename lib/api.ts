import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiError = {
  error: string;
  fields?: Record<string, string>;
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(error: ZodError | string): NextResponse<ApiError> {
  if (typeof error === "string") {
    return NextResponse.json({ error }, { status: 400 });
  }

  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }

  return NextResponse.json({ error: "Please check the highlighted fields.", fields }, { status: 400 });
}

export function unauthorized(message = "Not authorised"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Something went wrong"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 500 });
}
