/**
 * WEB ADDRESSES FROM TITLES — Revision 27 §3.
 *
 *   npm run test:slug
 *
 * The pure helper, then uniqueness against an in-memory MongoDB: reserved
 * words, -2/-3 collisions, old addresses counting as taken, and a forced
 * E11000 race that must resolve to a free address.
 */
import assert from "node:assert/strict";
import mongoose, { Schema } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { baseSlug, fallbackSlug, normaliseSlug, slugFromTitle, RESERVED_SLUGS, SLUG_MAX } from "@/lib/slug";
import { uniqueSlug, withUniqueSlug } from "@/lib/slug-server";

let passed = 0;
const check = (name: string, fn: () => void | Promise<void>) =>
  Promise.resolve(fn()).then(() => {
    passed++;
    console.log(`  ok   ${name}`);
  });

async function main() {
  // ---------------------------------------------------------------- pure
  await check("the Makola title", () => {
    // §2.2's rules: lowercase, apostrophe dropped without a gap, leading "the"
    // dropped, whole words kept. (The spec's example also drops "are"; no
    // rule in §2.2 says to, so the rules win.)
    assert.equal(
      slugFromTitle("The Tailors of Makola Are Designing Ghana's New Silhouette"),
      "tailors-of-makola-are-designing-ghanas-new-silhouette",
    );
  });
  await check("accented names", () => {
    assert.equal(slugFromTitle("Kọ́lá Adébáyọ̀ in Lagos"), "kola-adebayo-in-lagos");
    assert.equal(normaliseSlug("Ànàñsé Kwàkú"), "ananse-kwaku");
  });
  await check("& becomes and", () => {
    assert.equal(slugFromTitle("Salt & Light"), "salt-and-light");
    assert.equal(slugFromTitle("R&B Sundays"), "r-and-b-sundays");
  });
  await check("apostrophes are dropped without a gap", () => {
    assert.equal(slugFromTitle("Ghana's Next Decade"), "ghanas-next-decade");
    assert.equal(slugFromTitle("Ghana’s Next Decade"), "ghanas-next-decade");
    assert.equal(slugFromTitle("Don't Stop"), "dont-stop");
  });
  await check("an all-emoji title falls back to type-date", () => {
    assert.equal(slugFromTitle("🔥🔥🔥 ✨"), "");
    const d = new Date("2026-10-06T12:00:00Z");
    assert.equal(baseSlug("article", "🔥🔥🔥", d), "article-2026-10-06");
    assert.equal(fallbackSlug("event", d), "event-2026-10-06");
  });
  await check("a 200-character title is cut at a word boundary, ≤ 60", () => {
    const words = "sound system culture in accra from the harbour to the hills and back again every saturday night".split(" ");
    let title = "";
    while (title.length < 200) title += (title ? " " : "") + words[title.split(" ").length % words.length];
    assert.ok(title.length >= 200);
    const slug = slugFromTitle(title);
    assert.ok(slug.length <= SLUG_MAX, `${slug.length} > ${SLUG_MAX}`);
    const full = normaliseSlug(title);
    assert.ok(full.startsWith(slug) && full[slug.length] === "-", "cut mid-word");
  });
  await check("leading the / a / an dropped, but never the whole title", () => {
    assert.equal(slugFromTitle("A Night at Jamestown"), "night-at-jamestown");
    assert.equal(slugFromTitle("An Archive of Sound"), "archive-of-sound");
    assert.equal(slugFromTitle("The"), "the");
  });
  await check("reserved list includes the app/ routes and the base words", () => {
    for (const w of ["archive", "new", "edit", "admin", "api", "drafts", "latest"]) assert.ok(RESERVED_SLUGS.has(w), w);
  });

  // ---------------------------------------------------------- database
  const server = await MongoMemoryServer.create();
  try {
    await mongoose.connect(server.getUri());
    const Thing = mongoose.model(
      "SlugThing",
      new Schema({
        slug: { type: String, required: true, unique: true },
        previousSlugs: { type: [String], default: [] },
      }),
    );
    await Thing.init(); // build the unique index before racing it

    await check("a reserved word is treated as taken", async () => {
      assert.equal(await uniqueSlug(Thing, slugFromTitle("Archive")), "archive-2");
      assert.equal(await uniqueSlug(Thing, "new"), "new-2");
    });

    await check("a collision produces -2, then -3", async () => {
      await Thing.create({ slug: "harmattan-season" });
      assert.equal(await uniqueSlug(Thing, "harmattan-season"), "harmattan-season-2");
      await Thing.create({ slug: "harmattan-season-2" });
      assert.equal(await uniqueSlug(Thing, "harmattan-season"), "harmattan-season-3");
    });

    await check("an old address counts as taken", async () => {
      await Thing.create({ slug: "osu-after-rain", previousSlugs: ["osu-rain"] });
      assert.equal(await uniqueSlug(Thing, "osu-rain"), "osu-rain-2");
    });

    await check("a document doesn't collide with itself", async () => {
      const own = await Thing.findOne({ slug: "harmattan-season" });
      assert.equal(await uniqueSlug(Thing, "harmattan-season", { excludeId: own!._id }), "harmattan-season");
    });

    await check("a forced E11000 race resolves to a free address", async () => {
      let attempts = 0;
      const saved = await withUniqueSlug(Thing, "keta-lagoon", async (slug) => {
        attempts++;
        // Another save wins the race for exactly this address, between our
        // check and our write — the unique index rejects ours with E11000.
        if (attempts === 1) await Thing.collection.insertOne({ slug, previousSlugs: [] });
        return Thing.create({ slug });
      });
      assert.equal(attempts, 2, "it should retry once");
      assert.equal(saved.slug, "keta-lagoon-2");
      assert.equal(await Thing.countDocuments({ slug: /^keta-lagoon/ }), 2);
    });
  } finally {
    await mongoose.disconnect();
    await server.stop();
  }

  console.log(`\nslug: PASS (${passed} checks)`);
}

main().catch((err) => {
  console.error(`  FAIL ${err.message}`);
  process.exit(1);
});
