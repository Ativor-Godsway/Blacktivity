"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import Card, { Empty } from "./ui/Card";
import TrackPicker from "./TrackPicker";
import TrackEditPanel from "./TrackEditPanel";
import type { EntryValue, TrackLite, VolumeFormValues } from "./rotation-types";
import { volumeLabel, PLAYLIST_PLATFORMS } from "@/lib/rotation";

/**
 * The volume editor: three independently editable panels — New Music, The
 * Chart, Curation — under one header row.
 *
 * REORDERING IS KEYBOARD-FIRST. Every chart row carries up/down buttons, and
 * drag is layered on top as a convenience. Drag-only reordering is not keyboard
 * accessible and would fail the acceptance criteria this admin already meets,
 * so the buttons are the real control and no drag-and-drop library ships at
 * all — @dnd-kit would have been ~12kb of client JS for a ten-row list.
 *
 * Position is never typed: it is the row's index, so it cannot collide.
 */
type ListKey = "newMusic" | "chart" | "curation";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function VolumeEditor({
  id,
  initial,
  initialTracks,
  previousChart,
  clicks,
}: {
  id?: string;
  initial: VolumeFormValues;
  /** Every track referenced by this volume, and by the volume it can copy. */
  initialTracks: TrackLite[];
  /** "Start from last volume" — the previous volume's chart, in order. */
  previousChart?: { number: number; entries: EntryValue[] } | null;
  /** Last volume's opens per track, so he can see what people actually opened. */
  clicks?: { label: string; title: string; count: number }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<VolumeFormValues>(initial);
  const [tracks, setTracks] = useState<Map<string, TrackLite>>(
    () => new Map(initialTracks.map((t) => [t.id, t])),
  );
  const [picker, setPicker] = useState<ListKey | null>(null);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const listOf = (key: ListKey): EntryValue[] =>
    key === "curation" ? (values.curation?.tracks ?? []) : values[key];

  function setList(key: ListKey, next: EntryValue[]) {
    setValues((v) =>
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
    if (key === "chart" && current.length >= 10) {
      setMessage("The chart holds ten. Remove one first.");
      return;
    }
    setList(key, [...current, { trackId: track.id, note: "" }]);
    setMessage(reused ? `Reused the existing track document for ${track.artist} — ${track.title}.` : "");
  }

  async function save(status?: "draft" | "published") {
    setMessage("");
    setPending(true);

    const nextStatus = status ?? values.status;

    const payload = {
      number: values.number,
      status: nextStatus,
      publishedAt: values.publishedAt || null,
      intro: values.intro,
      newMusic: values.newMusic.map((e) => ({ track: e.trackId, note: e.note })),
      chart: values.chart.map((e, i) => ({ track: e.trackId, note: e.note, position: i + 1 })),
      curation: values.curation
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
        : null,
      playlists: values.playlists,
    };

    try {
      const res = await fetch(id ? `/api/admin/rotation/${id}` : "/api/admin/rotation", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        setMessage(body.error ?? "Couldn't save.");
        return;
      }

      setValues((v) => ({ ...v, status: nextStatus }));

      if (!id && body.id) {
        router.push(`/admin/rotation/${body.id}`);
      } else {
        setMessage(nextStatus === "published" ? "Published." : "Saved as a draft.");
      }
      router.refresh();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  /**
   * `numbered` and `reorderable` are SEPARATE on purpose.
   *
   * New Music is reorderable but carries no numbers: the public page groups it
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
          Nothing here yet — paste a link to add the first track.
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
              className="flex items-start gap-3 border-b a-border py-3 last:border-0"
            >
              {numbered ? (
                <span className="a-num a-muted mt-2 w-6 text-[13px]">{String(i + 1).padStart(2, "0")}</span>
              ) : null}

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

              <span className="mt-1 min-w-0 flex-1">
                <span className="block truncate text-[13.5px]">{track?.artist ?? "Unknown track"}</span>
                <span className="a-muted block truncate text-[12px]">{track?.title ?? entry.trackId}</span>
              </span>

              {/* Two lines, auto-growing, with a count that appears past 100.
                  A single-line input truncated notes mid-word. */}
              <span className="w-[240px] flex-none">
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
                  <span className="a-muted a-num mt-1 block text-right text-[11px]">
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
                  REMOVE FROM VOLUME, never "delete". This drops the reference
                  and never touches the Track document — the track keeps its
                  history in every other volume. Deleting a track lives only in
                  the library. The old bare "×" sat next to the note field,
                  which is exactly where a misclick happens.
                */}
                <button
                  type="button"
                  className="a-btn a-btn-ghost"
                  onClick={() => setList(listKey, list.filter((_, j) => j !== i))}
                  aria-label={`Remove ${name} from this volume`}
                  title="Removes it from this volume only — the track itself is kept."
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

  function PlaylistFields({ listKey }: { listKey: "newMusic" | "chart" | "curation" }) {
    return (
      <div className="mt-5 grid grid-cols-1 gap-3 border-t a-border pt-4 md:grid-cols-3">
        {PLAYLIST_PLATFORMS.map((platform) => (
          <label key={platform} className="flex flex-col gap-1.5">
            <span className="a-meta">{platform} playlist</span>
            <input
              className="a-input"
              placeholder="https://"
              value={values.playlists[listKey][platform]}
              onChange={(e) =>
                setValues((v) => ({
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
    );
  }

  /**
   * Only tracks that were actually opened. A row reading 0 against a blank bar
   * carries no information and reads as a broken chart sitting next to real
   * data — which is the same complaint that earned this panel its empty state.
   */
  const ranked = useMemo(() => (clicks ?? []).filter((c) => c.count > 0), [clicks]);
  const maxClicks = useMemo(() => Math.max(1, ...ranked.map((c) => c.count)), [ranked]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        {editingTrack ? (
          <TrackEditPanel
            trackId={editingTrack}
            onClose={() => setEditingTrack(null)}
            onSaved={({ merged, keptId }) => {
              setMessage(
                merged
                  ? "Merged into the existing track. Reload to see the repointed rows."
                  : "Track updated in every volume it appears in.",
              );
              // A merge repoints this volume's rows onto the kept document, so
              // the local list has to follow or the next save would write the
              // deleted id straight back.
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

        <Card title={volumeLabel(values.number)} note={id ? "Editing" : "New volume"}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="a-meta">Volume number</span>
              <input
                type="number"
                min={1}
                className="a-input"
                value={values.number}
                onChange={(e) => setValues((v) => ({ ...v, number: Number(e.target.value) || 1 }))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="a-meta">Publish date</span>
              <input
                type="date"
                className="a-input"
                value={values.publishedAt}
                onChange={(e) => setValues((v) => ({ ...v, publishedAt: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="a-meta">Status</span>
              <select
                className="a-input"
                value={values.status}
                onChange={(e) =>
                  setValues((v) => ({ ...v, status: e.target.value as "draft" | "published" }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="a-meta">Intro — {240 - values.intro.length} characters left</span>
            <textarea
              className="a-input"
              rows={3}
              maxLength={240}
              value={values.intro}
              onChange={(e) => setValues((v) => ({ ...v, intro: e.target.value }))}
            />
          </label>

          {previousChart ? (
            <div className="mt-4 border-t a-border pt-4">
              <button
                type="button"
                className="a-btn a-btn-ghost"
                onClick={() => setValues((v) => ({ ...v, chart: previousChart.entries }))}
              >
                Start from Vol. {String(previousChart.number).padStart(2, "0")}
              </button>
              <p className="a-muted mt-2 text-[12px]">
                Copies that volume&rsquo;s chart in as a starting point. At a bi-weekly cadence most
                positions carry over — this is three edits instead of twenty minutes of retyping.
              </p>
            </div>
          ) : null}
        </Card>

        <Card
          title="New Music"
          note="Unranked — the page groups these by release date"
          action={
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setPicker("newMusic")}>
              Add track
            </button>
          }
        >
          {picker === "newMusic" ? (
            <div className="mb-4">
              <TrackPicker onAdd={(t, reused) => addTrack("newMusic", t, reused)} onClose={() => setPicker(null)} />
            </div>
          ) : null}
          <p className="a-muted mb-3 text-[12px]">
            Use ▲ / ▼ to order tracks within a release date — the public page groups by date, so
            this is the only thing that fixes the order inside a group. No numbers: the list is not
            a ranking.
          </p>
          <EntryRows listKey="newMusic" numbered={false} />
          <PlaylistFields listKey="newMusic" />
        </Card>

        <Card
          title="The Chart"
          note={`${values.chart.length} of 10 — order is the position`}
          action={
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setPicker("chart")}>
              Add track
            </button>
          }
        >
          {picker === "chart" ? (
            <div className="mb-4">
              <TrackPicker onAdd={(t, reused) => addTrack("chart", t, reused)} onClose={() => setPicker(null)} />
            </div>
          ) : null}
          <p className="a-muted mb-3 text-[12px]">
            Drag a row, or use the ▲ / ▼ buttons — both do the same thing. Movement, weeks and peak
            are derived from the published volumes at render time and are never stored here.
          </p>
          <EntryRows listKey="chart" numbered />
          <PlaylistFields listKey="chart" />
        </Card>

        <Card
          title="Creators Curation"
          note="Omitted from the page entirely when empty"
          action={
            values.curation ? (
              <button
                type="button"
                className="a-btn a-btn-danger"
                onClick={() => setValues((v) => ({ ...v, curation: null }))}
              >
                Remove curation
              </button>
            ) : (
              <button
                type="button"
                className="a-btn a-btn-ghost"
                onClick={() =>
                  setValues((v) => ({
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
                        setValues((v) => ({
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
                    setValues((v) => ({
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
              <PlaylistFields listKey="curation" />
            </div>
          ) : (
            <p className="a-muted text-[13px]">
              No curator on this volume. The section is omitted from the page — there is no
              &ldquo;curator TBA&rdquo; state.
            </p>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="a-btn a-btn-primary" disabled={pending} onClick={() => save()}>
            {pending ? "Saving…" : id ? "Save volume" : "Create volume"}
          </button>
          {id && values.status === "draft" ? (
            <button type="button" className="a-btn a-btn-ghost" disabled={pending} onClick={() => save("published")}>
              Publish
            </button>
          ) : null}
          {id ? (
            <Link href={`/rotation/${`vol-${String(values.number).padStart(2, "0")}`}`} target="_blank" className="a-btn a-btn-ghost">
              View ↗
            </Link>
          ) : null}
          {message ? (
            <span className="a-ink2 text-[13px]" role="status">
              {message}
            </span>
          ) : null}
        </div>
      </div>

      {/* The rail is advisory: he decides the order, the data informs it. */}
      <aside className="flex flex-col gap-6">
        <Card title="Last volume's clicks" note="Opens per track">
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
                previousChart
                  ? `This fills in once Vol. ${String(previousChart.number).padStart(2, "0")} has been live for a few days.`
                  : "This fills in once a volume has been live for a few days and readers have opened some links."
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

export default VolumeEditor;
