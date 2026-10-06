"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card, { Empty } from "./ui/Card";
import TrackPicker from "./TrackPicker";
import TrackEditPanel from "./TrackEditPanel";
import type { EntryValue, RotationFormValues, TrackLite } from "./rotation-types";
import { CHART_SIZE, PLAYLIST_PLATFORMS, ROTATION_CURATION_EDITOR, rotationLabel } from "@/lib/rotation";

/**
 * /admin/rotation — the Top 10 and New Releases, ready to edit. Revision 27.
 *
 * There is no list of volumes in front of this screen. It edits the CURRENT
 * rotation; saving publishes; "Start a new rotation" at the foot archives the
 * current lists and opens the next one. The owner never types a number, a
 * date or a status.
 *
 * REORDERING IS KEYBOARD-FIRST and unchanged from Revision 13. Every row
 * carries up/down buttons, and drag is layered on top as a convenience.
 * Position is never typed: it is the row's index, so it cannot collide.
 *
 * The curation panel (Revision 17 §6) is behind ROTATION_CURATION_EDITOR in
 * lib/rotation.ts: the public page doesn't show it, so neither does this.
 */
type ListKey = "newMusic" | "chart" | "curation";

const NEW_RELEASES_MAX = 12;

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

const releaseDay = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase()
    : "";

export function RotationEditor({
  initial,
  initialTracks,
  updatedAt,
  number,
  previousNumber,
  clicks,
}: {
  initial: RotationFormValues;
  /** Every track referenced by the current rotation. */
  initialTracks: TrackLite[];
  /** ISO time the current rotation was last saved, or null on a fresh database. */
  updatedAt: string | null;
  /** The current rotation's number — shown only in "Start a new rotation". */
  number: number | null;
  /** The rotation before this one, for the clicks rail's empty state. */
  previousNumber: number | null;
  /** Last rotation's opens per track, so he can see what people actually opened. */
  clicks?: { label: string; title: string; count: number }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<RotationFormValues>(initial);
  const [tracks, setTracks] = useState<Map<string, TrackLite>>(
    () => new Map(initialTracks.map((t) => [t.id, t])),
  );
  const [picker, setPicker] = useState<ListKey | null>(null);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [edits, setEdits] = useState(0);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [starting, setStarting] = useState(false);
  const dragFrom = useRef<number | null>(null);

  /** Every user change goes through here, so the Save button can count them. */
  const change = useCallback((fn: (v: RotationFormValues) => RotationFormValues) => {
    setValues(fn);
    setEdits((n) => n + 1);
  }, []);

  const listOf = (key: ListKey): EntryValue[] =>
    key === "curation" ? (values.curation?.tracks ?? []) : values[key];

  function setList(key: ListKey, next: EntryValue[]) {
    change((v) =>
      key === "curation"
        ? { ...v, curation: v.curation ? { ...v.curation, tracks: next } : v.curation }
        : { ...v, [key]: next },
    );
  }

  function addTrack(key: ListKey, track: TrackLite, reused: boolean) {
    setTracks((m) => new Map(m).set(track.id, track));
    const current = listOf(key);
    if (current.some((e) => e.trackId === track.id)) {
      setMessage(`${track.artist} — ${track.title} is already in that list.`);
      return;
    }
    if (key === "chart" && current.length >= CHART_SIZE) {
      setMessage("The Top 10 is full. Remove a track first.");
      return;
    }
    if (key === "newMusic" && current.length >= NEW_RELEASES_MAX) {
      setMessage(`New Releases holds up to ${NEW_RELEASES_MAX} tracks. Remove one first.`);
      return;
    }
    setList(key, [...current, { trackId: track.id, note: "" }]);
    setMessage(reused ? `Added ${track.artist} — ${track.title} from the track library.` : "");
  }

  /** The reason Save is blocked, in plain words — or null. */
  const problem = useMemo(() => {
    if (values.chart.length !== CHART_SIZE) {
      return `Top 10 needs 10 tracks (${values.chart.length} added)`;
    }
    if (values.newMusic.length < 1) return "New Releases needs at least one track";
    if (values.newMusic.length > NEW_RELEASES_MAX) {
      return `New Releases holds up to ${NEW_RELEASES_MAX} tracks (${values.newMusic.length} added)`;
    }
    return null;
  }, [values.chart.length, values.newMusic.length]);

  // Leaving with unsaved changes warns first: closing the tab, and following
  // any link inside the admin (client navigation never fires beforeunload).
  useEffect(() => {
    if (edits === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
      if (!window.confirm("You have unsaved changes to the Rotation. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [edits]);

  async function save() {
    if (problem) return;
    setMessage("");
    setPending(true);

    const payload: Record<string, unknown> = {
      intro: values.intro,
      newMusic: values.newMusic.map((e) => ({ track: e.trackId, note: e.note })),
      chart: values.chart.map((e) => ({ track: e.trackId, note: e.note })),
      playlists: { chart: values.playlists.chart, newMusic: values.playlists.newMusic },
    };
    if (ROTATION_CURATION_EDITOR) {
      payload.curation = values.curation
        ? {
            curator: {
              name: values.curation.curator.name,
              igHandle: values.curation.curator.igHandle,
              discipline: values.curation.curator.discipline,
              statement: values.curation.curator.statement,
              photo: values.curation.curator.photo
                ? {
                    url: values.curation.curator.photo.url,
                    publicId: "",
                    alt: values.curation.curator.photo.alt,
                    width: values.curation.curator.photo.width,
                    height: values.curation.curator.photo.height,
                    blurDataURL: values.curation.curator.photo.blurDataURL ?? "",
                  }
                : null,
            },
            tracks: values.curation.tracks.map((e) => ({ track: e.trackId, note: e.note })),
          }
        : null;
    }

    try {
      const res = await fetch("/api/admin/rotation/current", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Couldn't save.");
        return;
      }
      setEdits(0);
      setMessage("Saved. It's live on the site.");
      router.refresh();
    } catch {
      setMessage("Network error. Your changes are still here — try again.");
    } finally {
      setPending(false);
    }
  }

  async function startNew() {
    setStarting(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/rotation/start", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { number?: number; error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Couldn't start a new rotation.");
        return;
      }
      setConfirmingNew(false);
      setMessage(`${rotationLabel(body.number ?? 0)} started with the same tracks. Edit them and save.`);
      router.refresh();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setStarting(false);
    }
  }

  // The server re-renders with the new rotation after a refresh; follow it.
  useEffect(() => {
    setValues(initial);
    setTracks(new Map(initialTracks.map((t) => [t.id, t])));
    setEdits(0);
  }, [initial, initialTracks]);

  /**
   * `numbered` and `reorderable` are SEPARATE on purpose.
   *
   * New Releases is reorderable but carries no numbers: the public page dates it
   * by release date, so order within a date group needs to be fixable, but
   * numbering it would tell the reader it is a ranking. Only the chart is both.
   */
  function EntryRows({
    listKey,
    numbered,
    reorderable = true,
  }: {
    listKey: ListKey;
    numbered: boolean;
    reorderable?: boolean;
  }) {
    const list = listOf(listKey);

    if (list.length === 0) {
      return (
        <p className="a-muted py-6 text-center text-[13px]">
          Nothing here yet — use Add track to paste a link.
        </p>
      );
    }

    return (
      <ol className="flex flex-col">
        {list.map((entry, i) => {
          const track = tracks.get(entry.trackId);
          const name = track ? `${track.artist} — ${track.title}` : "this track";

          return (
            <li
              key={entry.trackId}
              draggable={reorderable}
              onDragStart={() => (dragFrom.current = i)}
              onDragOver={(e) => reorderable && e.preventDefault()}
              onDrop={() => {
                if (!reorderable || dragFrom.current === null) return;
                setList(listKey, move(list, dragFrom.current, i));
                dragFrom.current = null;
              }}
              // Wraps on a phone: the note drops under the title and the
              // controls under that, instead of being pushed out of the card.
              className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b a-border py-3 last:border-0 sm:flex-nowrap"
            >
              {numbered ? (
                <span className="a-num a-muted mt-2 w-6 text-[13px]">{String(i + 1).padStart(2, "0")}</span>
              ) : (
                <span className="a-num a-muted mt-2 w-14 flex-none text-[12px]">{releaseDay(track?.releaseDate ?? "")}</span>
              )}

              {track?.artwork?.url ? (
                <Image
                  src={track.artwork.url}
                  alt=""
                  width={36}
                  height={36}
                  className="mt-1 size-9 flex-none object-cover"
                />
              ) : (
                <span className="a-bg-rule mt-1 size-9 flex-none" aria-hidden="true" />
              )}

              <span className="mt-1 min-w-0 flex-1 basis-40">
                <span className="block truncate text-[13.5px]">{track?.artist ?? "Unknown track"}</span>
                <span className="a-muted block truncate text-[12px]">{track?.title ?? entry.trackId}</span>
              </span>

              {/* Two lines, auto-growing, with a count that appears past 100.
                  A single-line input truncated notes mid-word. */}
              <span className="basis-full sm:w-[240px] sm:flex-none sm:basis-auto">
                <span className="a-autogrow" data-value={entry.note}>
                  <textarea
                    rows={2}
                    value={entry.note}
                    maxLength={120}
                    placeholder="Note (optional)"
                    aria-label={`Note for ${name}`}
                    onChange={(e) => {
                      const next = list.slice();
                      next[i] = { ...next[i]!, note: e.target.value };
                      setList(listKey, next);
                    }}
                  />
                </span>
                {entry.note.length > 100 ? (
                  <span className="a-muted a-num mt-1 block text-right text-[12px]">
                    {entry.note.length}/120
                  </span>
                ) : null}
              </span>

              {reorderable ? (
                <span className="mt-1 flex flex-none gap-1">
                  {/* The keyboard path, not a fallback for it. */}
                  <button
                    type="button"
                    className="a-btn a-btn-ghost px-2"
                    disabled={i === 0}
                    onClick={() => setList(listKey, move(list, i, i - 1))}
                    aria-label={`Move ${name} up to position ${i}`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="a-btn a-btn-ghost px-2"
                    disabled={i === list.length - 1}
                    onClick={() => setList(listKey, move(list, i, i + 1))}
                    aria-label={`Move ${name} down to position ${i + 2}`}
                  >
                    ▼
                  </button>
                </span>
              ) : null}

              <span className="mt-1 flex flex-none gap-1">
                <button
                  type="button"
                  className="a-btn a-btn-ghost"
                  onClick={() => setEditingTrack(entry.trackId)}
                  aria-label={`Edit ${name}`}
                >
                  Edit
                </button>
                {/*
                  REMOVE FROM THE LIST, never "delete". This drops the reference
                  and never touches the Track document — the track keeps its
                  history in every past rotation. Deleting a track lives only in
                  the library. The old bare "×" sat next to the note field,
                  which is exactly where a misclick happens.
                */}
                <button
                  type="button"
                  className="a-btn a-btn-ghost"
                  onClick={() => setList(listKey, list.filter((_, j) => j !== i))}
                  aria-label={`Remove ${name} from this list`}
                  title="Removes it from this list only — the track itself is kept in the library."
                >
                  Remove
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  function PlaylistFields({ listKey, label }: { listKey: "newMusic" | "chart" | "curation"; label: string }) {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="a-field-label mb-2">{label}</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PLAYLIST_PLATFORMS.map((platform) => (
            <label key={platform} className="flex flex-col gap-1.5">
              <span className="a-meta">{platform}</span>
              <input
                className="a-input"
                placeholder="https://"
                value={values.playlists[listKey][platform]}
                onChange={(e) =>
                  change((v) => ({
                    ...v,
                    playlists: {
                      ...v.playlists,
                      [listKey]: { ...v.playlists[listKey], [platform]: e.target.value },
                    },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  /**
   * Only tracks that were actually opened. A row reading 0 against a blank bar
   * carries no information and reads as a broken chart sitting next to real
   * data — which is the same complaint that earned this panel its empty state.
   */
  const ranked = useMemo(() => (clicks ?? []).filter((c) => c.count > 0), [clicks]);
  const maxClicks = useMemo(() => Math.max(1, ...ranked.map((c) => c.count)), [ranked]);

  const updated = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* The one Save. Sticky, so it is in reach from the bottom of New Releases. */}
        <div className="a-card sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px]">
              {updated ? <>Last updated {updated} · Live on the site</> : "Nothing published yet — your first save puts it live."}
            </p>
            {message ? (
              <p className="a-ink2 text-[13px]" role="status">
                {message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {problem ? (
              <span className="a-field-error uppercase tracking-[0.06em]" id="save-problem">
                {problem}
              </span>
            ) : null}
            <Link href="/rotation" target="_blank" className="a-btn a-btn-ghost">
              View on site ↗
            </Link>
            <button
              type="button"
              className="a-btn a-btn-primary uppercase tracking-[0.06em]"
              disabled={pending || Boolean(problem)}
              aria-describedby={problem ? "save-problem" : undefined}
              onClick={save}
            >
              {pending ? "Saving…" : edits > 0 ? `Save changes • ${edits} edit${edits === 1 ? "" : "s"}` : "Save changes"}
            </button>
          </div>
        </div>

        {editingTrack ? (
          <TrackEditPanel
            trackId={editingTrack}
            onClose={() => setEditingTrack(null)}
            onSaved={({ merged, keptId }) => {
              setMessage(
                merged
                  ? "Merged into the existing track."
                  : "Track updated everywhere it appears.",
              );
              // A merge repoints this rotation's rows onto the kept document,
              // so the local list has to follow or the next save would write
              // the deleted id straight back.
              if (merged && editingTrack !== keptId) {
                const swap = (rows: EntryValue[]) =>
                  rows
                    .map((r) => (r.trackId === editingTrack ? { ...r, trackId: keptId } : r))
                    .filter((r, i, all) => all.findIndex((x) => x.trackId === r.trackId) === i);
                setValues((v) => ({
                  ...v,
                  newMusic: swap(v.newMusic),
                  chart: swap(v.chart),
                  curation: v.curation ? { ...v.curation, tracks: swap(v.curation.tracks) } : v.curation,
                }));
              }
              router.refresh();
            }}
          />
        ) : null}

        <Card
          title="Top 10"
          note={`${values.chart.length} / 10`}
          action={
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setPicker("chart")}>
              + Add track
            </button>
          }
        >
          {picker === "chart" ? (
            <div className="mb-4">
              <TrackPicker onAdd={(t, reused) => addTrack("chart", t, reused)} onClose={() => setPicker(null)} />
            </div>
          ) : null}
          <p className="a-muted mb-3 text-[12px]">
            The order is the ranking. Use ▲ / ▼ (or drag a row) to move a track. The arrows readers
            see — up, down, new — are worked out from the previous rotation automatically.
          </p>
          <EntryRows listKey="chart" numbered />
        </Card>

        <Card
          title="New Releases"
          note={`${values.newMusic.length} track${values.newMusic.length === 1 ? "" : "s"}`}
          action={
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setPicker("newMusic")}>
              + Add track
            </button>
          }
        >
          {picker === "newMusic" ? (
            <div className="mb-4">
              <TrackPicker onAdd={(t, reused) => addTrack("newMusic", t, reused)} onClose={() => setPicker(null)} />
            </div>
          ) : null}
          <p className="a-muted mb-3 text-[12px]">
            The site lists these newest release first. ▲ / ▼ only decide the order of tracks released
            on the same day. Up to {NEW_RELEASES_MAX} tracks.
          </p>
          <EntryRows listKey="newMusic" numbered={false} />
        </Card>

        <Card title="Playlist links" note="Optional">
          <div className="flex flex-col gap-6">
            <PlaylistFields listKey="chart" label="Top 10 playlist" />
            <PlaylistFields listKey="newMusic" label="New Releases playlist" />
          </div>
        </Card>

        <Card title="Introduction" note={`${240 - values.intro.length} characters left`}>
          <label className="flex flex-col gap-1.5">
            <span className="a-muted text-[12px]">A line or two shown at the top of the Rotation page. Optional.</span>
            <textarea
              className="a-input"
              rows={3}
              maxLength={240}
              value={values.intro}
              aria-label="Introduction"
              onChange={(e) => change((v) => ({ ...v, intro: e.target.value }))}
            />
          </label>
        </Card>

        {ROTATION_CURATION_EDITOR ? (
        <Card
            title="Creators Curation"
            note="Not currently shown on the public page"
            action={
              values.curation ? (
                <button
                  type="button"
                  className="a-btn a-btn-danger"
                  onClick={() => change((v) => ({ ...v, curation: null }))}
                >
                  Remove curation
                </button>
              ) : (
                <button
                  type="button"
                  className="a-btn a-btn-ghost"
                  onClick={() =>
                    change((v) => ({
                      ...v,
                      curation: {
                        curator: { name: "", igHandle: "", discipline: "", statement: "", photo: null },
                        tracks: [],
                      },
                    }))
                  }
                >
                  Add a curator
                </button>
              )
            }
          >
            <details>
              <summary className="a-ink2 cursor-pointer text-[13px]">
                Kept and still editable — it is simply not rendered on /rotation.
              </summary>
              <div className="mt-4">
            {values.curation ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(
                    [
                      ["name", "Name"],
                      ["igHandle", "Instagram handle"],
                      ["discipline", "Discipline"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="a-meta">{label}</span>
                      <input
                        className="a-input"
                        value={values.curation!.curator[key]}
                        onChange={(e) =>
                          change((v) => ({
                            ...v,
                            curation: v.curation
                              ? { ...v.curation, curator: { ...v.curation.curator, [key]: e.target.value } }
                              : v.curation,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
  
                <label className="flex flex-col gap-1.5">
                  <span className="a-meta">
                    Statement — {400 - values.curation.curator.statement.length} characters left
                  </span>
                  <textarea
                    className="a-input"
                    rows={4}
                    maxLength={400}
                    value={values.curation.curator.statement}
                    onChange={(e) =>
                      change((v) => ({
                        ...v,
                        curation: v.curation
                          ? { ...v.curation, curator: { ...v.curation.curator, statement: e.target.value } }
                          : v.curation,
                      }))
                    }
                  />
                </label>
  
                <div>
                  <button type="button" className="a-btn a-btn-ghost" onClick={() => setPicker("curation")}>
                    Add track to the curation
                  </button>
                </div>
  
                {picker === "curation" ? (
                  <TrackPicker onAdd={(t, reused) => addTrack("curation", t, reused)} onClose={() => setPicker(null)} />
                ) : null}
  
                <EntryRows listKey="curation" numbered={false} />
                <PlaylistFields listKey="curation" label="Curation playlist" />
              </div>
            ) : (
              <p className="a-muted text-[13px]">
                No curator on this rotation. Nothing is lost either way — the curation has no public
                surface on this revision.
              </p>
            )}
              </div>
            </details>
          </Card>
        ) : null}

        <Card title="Start a new rotation">
          <p className="a-ink2 max-w-[68ch] text-[13px]">
            Saves the current lists to the archive and starts a fresh rotation with the same tracks, so
            you can update them. Do this when you put out a new rotation (for example, every two weeks).
            Movement arrows on the Top 10 compare against the previous rotation.
          </p>
          {edits > 0 ? (
            <p className="a-field-hint mt-3">Save your changes first, so they go into the archive.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {confirmingNew ? (
              <>
                <span className="text-[13px]">
                  {number
                    ? `Archive ${rotationLabel(number)} and start ${rotationLabel(number + 1)}?`
                    : "Start the first rotation?"}
                </span>
                <button type="button" className="a-btn a-btn-primary" disabled={starting} onClick={startNew}>
                  {starting ? "Starting…" : "Yes, start it"}
                </button>
                <button type="button" className="a-btn a-btn-ghost" onClick={() => setConfirmingNew(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="a-btn a-btn-ghost uppercase tracking-[0.06em]"
                disabled={edits > 0 || !number}
                onClick={() => setConfirmingNew(true)}
              >
                Start a new rotation
              </button>
            )}
          </div>
        </Card>

        <p className="text-[13px]">
          <Link href="/admin/rotation/past" className="underline underline-offset-2">
            Past rotations →
          </Link>
          <span className="a-muted"> · </span>
          <Link href="/admin/rotation/tracks" className="underline underline-offset-2">
            Track library →
          </Link>
        </p>
      </div>

      {/* The rail is advisory: he decides the order, the data informs it. */}
      <aside className="flex flex-col gap-6">
        <Card title="Last rotation's clicks" note="Opens per track">
          {/*
            Zeros against blank bars read as a BROKEN CHART rather than as an
            absence of data, so a rail where nothing has been recorded gets a
            designed empty state instead. Revision 04 requires one for every
            list; this one was missed.
          */}
          {ranked.length === 0 ? (
            <Empty
              title="No click data yet"
              body={
                previousNumber
                  ? `This fills in once ${rotationLabel(previousNumber)} has been live for a few days.`
                  : "This fills in once a rotation has been live for a few days and readers have opened some links."
              }
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {ranked.slice(0, 12).map((row) => (
                <li key={row.label} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13px]">{row.title}</span>
                  <span className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "var(--admin-rule)" }}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(row.count / maxClicks) * 100}%`, background: "var(--series-1)" }}
                    />
                  </span>
                  <span className="a-num w-8 text-right text-[13px]">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}

export default RotationEditor;
