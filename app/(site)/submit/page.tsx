import type { Metadata } from "next";
import PageHeader from "@/components/site/PageHeader";
import SubmitForm from "@/components/site/SubmitForm";
import MonoLabel from "@/components/ui/MonoLabel";

export const metadata: Metadata = {
  title: "Submit",
  description:
    "Send your work to Blacktivity. Photography, design, music, fashion, film and writing — the room is open.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <>
      <PageHeader
        label="#IGotBlacktivity"
        lines={["Your creativity", "belongs in", "the room."]}
        intro="Send us what you're making. No agency, no gatekeeping — a person reads every submission."
      />

      <div className="mx-auto max-w-[1600px] px-(--gutter) py-20">
        <div className="grid grid-cols-4 gap-x-(--gutter) gap-y-12 md:grid-cols-12">
          <aside className="col-span-4 md:col-span-3">
            <MonoLabel dim>What happens next</MonoLabel>
            <ol className="mt-6 border-t border-rule">
              {[
                "We read it — usually within a week.",
                "If it fits, we email you to talk.",
                "Selected work appears on the site and on our Instagram.",
              ].map((step, i) => (
                <li key={step} className="border-b border-rule py-4">
                  <MonoLabel dim>{String(i + 1).padStart(2, "0")}</MonoLabel>
                  <p className="mt-2 text-sm text-fg-muted">{step}</p>
                </li>
              ))}
            </ol>
          </aside>

          <div className="col-span-4 md:col-span-8 md:col-start-5">
            <SubmitForm />
          </div>
        </div>
      </div>
    </>
  );
}
