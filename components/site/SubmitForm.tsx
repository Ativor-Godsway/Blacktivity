"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import MonoLabel from "@/components/ui/MonoLabel";
import DisplayHeading from "@/components/motion/DisplayHeading";
import { DISCIPLINES } from "@/lib/constants";
import { submissionSchema } from "@/lib/validation";

type Errors = Record<string, string>;

const NOTE_MAX = 500;

export function SubmitForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [noteLength, setNoteLength] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      igHandle: String(form.get("igHandle") ?? ""),
      discipline: String(form.get("discipline") ?? ""),
      workUrl: String(form.get("workUrl") ?? ""),
      note: String(form.get("note") ?? ""),
      website: String(form.get("website") ?? ""),
    };

    // Validate with the same schema the API uses.
    const parsed = submissionSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDone(true);
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Errors;
      };
      if (body.fields) setErrors(body.fields);
      setFormError(body.error ?? "Something went wrong. Try again in a moment.");
    } catch {
      setFormError("Couldn't reach the studio. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="border border-rule p-10 md:p-16">
        <MonoLabel dim>Received</MonoLabel>
        <DisplayHeading
          lines={["It's in", "the room."]}
          className="mt-6 text-[clamp(2.5rem,7vw,5rem)]"
        />
        <p className="mt-8 max-w-[46ch] text-fg-muted">
          Thank you — genuinely. We read every submission ourselves, and if your
          work is a fit you&apos;ll hear from us by email. In the meantime, tag us
          with #IGotBlacktivity and we&apos;ll find you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      {/* Honeypot — visually and programmatically hidden from real users. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this blank</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" autoComplete="name" placeholder="Your full name" required />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Instagram" htmlFor="igHandle" error={errors.igHandle} hint="Optional">
          <Input id="igHandle" name="igHandle" placeholder="@yourhandle" />
        </Field>

        <Field label="Discipline" htmlFor="discipline" error={errors.discipline}>
          <Select id="discipline" name="discipline" defaultValue="" required>
            <option value="" disabled className="bg-bg">
              Choose one
            </option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d} className="bg-bg">
                {d}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Link to your work"
        htmlFor="workUrl"
        error={errors.workUrl}
        hint="Optional — a portfolio, Drive folder or Instagram post"
      >
        <Input id="workUrl" name="workUrl" type="url" placeholder="https://" />
      </Field>

      <Field
        label="Tell us about it"
        htmlFor="note"
        error={errors.note}
        hint={`${noteLength} / ${NOTE_MAX}`}
      >
        <Textarea
          id="note"
          name="note"
          rows={5}
          maxLength={NOTE_MAX}
          onChange={(e) => setNoteLength(e.target.value.length)}
          placeholder="What are you making, and what are you trying to say with it?"
        />
      </Field>

      {formError ? (
        <p className="mono text-fg" role="alert">
          ↳ {formError}
        </p>
      ) : null}

      <div className="flex items-center gap-6">
        <Button type="submit" disabled={pending} data-track="submission-submit">
          {pending ? "Sending…" : "Send it in ↗"}
        </Button>
        <MonoLabel dim>We read everything.</MonoLabel>
      </div>
    </form>
  );
}

export default SubmitForm;
