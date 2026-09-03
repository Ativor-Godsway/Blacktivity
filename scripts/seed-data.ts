import type { ArticleCategory, Discipline, SubmissionStatus } from "@/lib/constants";

/** Tiptap JSON helpers, so seeded bodies match what the editor produces. */
export const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
export const h2 = (text: string) => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});
export const quote = (text: string) => ({
  type: "blockquote",
  content: [p(text)],
});
export const doc = (nodes: unknown[]) => ({ type: "doc", content: nodes });

export type SeedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  category: ArticleCategory;
  tags: string[];
  author: { name: string; igHandle: string };
  featured: boolean;
  daysAgo: number;
  content: ReturnType<typeof doc>;
};

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title: "The Tailors of Makola Are Designing Ghana's Next Decade",
    slug: "tailors-of-makola",
    excerpt:
      "Behind the market's noise, a generation of tailors is quietly building the silhouette the rest of the world will copy in five years.",
    category: "Fashion",
    tags: ["Accra", "Tailoring", "Craft"],
    author: { name: "Efua Danso", igHandle: "efua.styles" },
    featured: true,
    daysAgo: 4,
    content: doc([
      p(
        "On a Thursday morning in Makola, the sound arrives before anything else: three hundred sewing machines running slightly out of time with each other, a rhythm nobody planned and everybody keeps. Auntie Mansa has worked from the same stall for nineteen years. She has never advertised. Her waiting list runs to eleven weeks.",
      ),
      p(
        "There is a story people like to tell about African fashion, in which the continent supplies the print and somebody else supplies the pattern. Stand in Makola long enough and the story falls apart. The pattern is here. It has been here the whole time. What has been missing is not skill but attribution.",
      ),
      h2("A silhouette built for the heat"),
      p(
        "Watch what actually gets made and a shape emerges — high armholes, a dropped shoulder, trousers cut wide at the knee and tapered hard at the ankle. It is not a reference to anything. It is a solution to ninety percent humidity, worked out over decades by people who had to wear the result.",
      ),
      quote("We are not doing heritage. We are doing Tuesday."),
      p(
        "That was Kofi, who is twenty-six and took over his father's stall in 2023. He says the word heritage the way you would hold something slightly damp. His clients are DJs, art directors, a pastor with very specific ideas about lapels. He cuts for all of them out of the same block.",
      ),
      p(
        "What changes in the next decade is not the craft. It is whether the names stay attached to it — whether Auntie Mansa's shape travels under her name or under somebody else's. That is a documentation problem, and documentation is something we can actually fix.",
      ),
    ]),
  },
  {
    title: "Highlife Never Left. We Just Stopped Listening Properly.",
    slug: "highlife-never-left",
    excerpt:
      "A generation raised on Afrobeats is going back through their parents' record crates — and finding the blueprint was there all along.",
    category: "Music",
    tags: ["Highlife", "Archive", "Sound"],
    author: { name: "Selorm Agbeko", igHandle: "selorm.writes" },
    featured: true,
    daysAgo: 11,
    content: doc([
      p(
        "The crate is in a back room in Kaneshie, and it belongs to a man who would prefer not to be named because, as he puts it, then everyone will want to come. There are perhaps four hundred records in it. Maybe a dozen exist anywhere else.",
      ),
      p(
        "For most of the last fifteen years, highlife has been treated as the thing that came before — a respectful footnote on the way to the chart. Spend an afternoon in that back room and the hierarchy inverts. The guitar lines that define the current sound are not new. They are being rediscovered, one sample at a time, often by producers who do not know what they are quoting.",
      ),
      h2("What the records actually teach"),
      p(
        "The lesson is not melody. It is patience. A highlife record is willing to take ninety seconds to arrive somewhere, and it trusts you to stay. Modern production, shaped by the eight-second attention economy, has largely lost the nerve for that.",
      ),
      quote("The archive is not behind us. It is underneath us."),
      p(
        "Young producers in Accra are starting to build differently — longer intros, live percussion, arrangements that breathe. It reads as a trend. It is closer to a correction.",
      ),
      p(
        "The urgent work is preservation. Vinyl in this climate has a lifespan, and the people who know what is on these records are not getting younger. Digitising a crate is unglamorous. It is also the single most valuable thing anyone could do for Ghanaian music this decade.",
      ),
    ]),
  },
  {
    title: "On Being Photographed Without Being Explained",
    slug: "photographed-without-explanation",
    excerpt:
      "Ama Serwaa Mensah on shooting her own city, and the difference between a portrait and an exhibit.",
    category: "Voices",
    tags: ["Photography", "Interview", "Accra"],
    author: { name: "Selorm Agbeko", igHandle: "selorm.writes" },
    featured: false,
    daysAgo: 19,
    content: doc([
      p(
        "Ama Serwaa Mensah shoots film, slowly, mostly in the two hours before sunset, and mostly of people she already knows. We spoke in her flat in Osu, surrounded by contact sheets she has not yet had the heart to cut up.",
      ),
      h2("On the two-hour window"),
      p(
        "\"It is not about the light being beautiful, though it is. It is that everyone is finished pretending by then. Morning photographs are performances. Evening photographs are people.\"",
      ),
      h2("On foreign photographers"),
      p(
        "\"I do not think most of them mean harm. But there is a way of photographing a place where every frame is secretly captioned — this is poverty, this is resilience, this is joy despite. The caption arrives before the person does. I am trying to make pictures that refuse to be explained.\"",
      ),
      quote("A portrait says: here is someone. An exhibit says: here is what someone means."),
      h2("On working slowly"),
      p(
        "\"Thirty-six frames makes you honest. You cannot spray and choose later. You have to decide, in the room, with the person watching, that this is the moment worth spending. That decision is the whole job.\"",
      ),
    ]),
  },
  {
    title: "The Grid Is a Political Object",
    slug: "grid-is-political",
    excerpt:
      "Why African design studios keep inheriting Swiss layout systems — and what happens when they stop.",
    category: "Art",
    tags: ["Design", "Typography", "Theory"],
    author: { name: "Nii Adjetey Quaye", igHandle: "niiadjetey" },
    featured: false,
    daysAgo: 27,
    content: doc([
      p(
        "Every designer trained in the last sixty years has inherited the same set of assumptions about how a page should behave. Twelve columns. A modular scale. Left-aligned, ragged right. These feel like physics. They are closer to weather — local, historical, and produced by particular people with particular problems.",
      ),
      h2("Where the grid came from"),
      p(
        "The system we treat as neutral was built in post-war Switzerland to solve for multilingual timetables and pharmaceutical packaging. It is extraordinarily good at that. It is a specific answer to a specific question, and we have been applying it to every question since.",
      ),
      quote("Neutrality is just a preference that stopped being argued with."),
      p(
        "This is not a call to throw the grid away. It is a very good tool and I use it daily, including on this publication. It is a call to notice that we are using it, and to be able to say why.",
      ),
      h2("What else is available"),
      p(
        "Adinkra symbols carry a compositional logic — radial, symmetrical, meaning-dense — that has almost never been translated into editorial layout. Kente is a grid, but a woven one, where the structure and the content are the same object. Neither has been seriously mined for screen design. That is an opportunity sitting in plain sight.",
      ),
    ]),
  },
  {
    title: "Nollywood's Quiet Revolution Is Happening in the Edit",
    slug: "nollywood-in-the-edit",
    excerpt:
      "The budgets have not changed much. The editors have. A generation of West African cutters is rewriting the grammar.",
    category: "Film",
    tags: ["Film", "Editing", "West Africa"],
    author: { name: "Yaa Owusu-Ansah", igHandle: "yaa.produces" },
    featured: false,
    daysAgo: 34,
    content: doc([
      p(
        "The conversation about West African film almost always begins with money, and almost always stops there. But sit with editors in Lagos and Accra and a different story surfaces — one about rhythm, and about a generation that stopped apologising for it.",
      ),
      h2("The apology cut"),
      p(
        "For years, the instinct was to cut like Hollywood, because cutting like Hollywood signalled seriousness. Scenes were trimmed to an imported pace that fought the performances. You can watch the apology happening frame by frame.",
      ),
      p(
        "What is changing is confidence. Editors are holding shots longer, letting conversations run at the speed people actually talk, trusting an audience that has never needed the training wheels.",
      ),
      quote("You cannot cut a Ghanaian argument to an American rhythm. The joke lands late."),
      p(
        "The result does not look like anything else, which is precisely the point. The films travelling furthest right now are the ones that stopped trying to travel.",
      ),
    ]),
  },
  {
    title: "The Studio Is a Room, Not a Brand",
    slug: "studio-is-a-room",
    excerpt:
      "On building a creative practice in a city that rewards output over infrastructure.",
    category: "Culture",
    tags: ["Studio", "Practice", "Accra"],
    author: { name: "Kwame Asare-Boadu", igHandle: "kwame.ab" },
    featured: false,
    daysAgo: 41,
    content: doc([
      p(
        "We spent our first four months as a studio without a studio. Shoots happened in borrowed flats, in a friend's uncle's warehouse in Spintex, once memorably in a stairwell. It taught us something we would not have learned with a lease: a studio is a set of relationships, and the room is only the place they meet.",
      ),
      h2("What a room actually does"),
      p(
        "It lowers the cost of showing up. That sounds small. It is close to everything. When there is somewhere to be on a Wednesday with no brief and no client, work gets made that no brief would have commissioned.",
      ),
      quote("Infrastructure is just the boring name for making it easy to be generous."),
      p(
        "Accra rewards visible output — the post, the drop, the campaign. It does not reward the unglamorous scaffolding that makes output repeatable. Most practices here burn out not from lack of talent but from having to rebuild the whole apparatus for every single job.",
      ),
      p(
        "So we build slowly. A lighting kit that stays in one place. A shared calendar. A publication, which is really just a promise to keep paying attention. None of it is exciting. All of it compounds.",
      ),
    ]),
  },
  {
    title: "Six Ghanaian Image-Makers to Watch This Year",
    slug: "six-image-makers",
    excerpt:
      "Not a ranking. A reading list — the photographers and directors whose work we keep returning to.",
    category: "Culture",
    tags: ["Photography", "Roundup", "Talent"],
    author: { name: "Ama Serwaa Mensah", igHandle: "amaserwaa.shoots" },
    featured: false,
    daysAgo: 52,
    content: doc([
      p(
        "Lists are a slightly dishonest format — they imply a competition nobody entered. Read this instead as six people whose work has changed how we look at things this year, in no order at all.",
      ),
      h2("The through-line"),
      p(
        "What connects them is not aesthetic. It is proximity. Every one of them is photographing a world they belong to, and it shows in the smallest decisions — where they stand, what they leave in frame, who is comfortable enough to look back at the lens.",
      ),
      quote("You can always tell when the photographer was invited."),
      p(
        "There is a version of documenting a city that requires distance, and it produces competent, unmemorable pictures. There is another version that requires being owed a favour. The second one is harder to fund and better to look at.",
      ),
      p(
        "We will be publishing longer conversations with several of them over the coming months. If you are making work in this direction, the submissions page is open.",
      ),
    ]),
  },
  {
    title: "What Accra Sounds Like at 4 A.M.",
    slug: "accra-at-four-am",
    excerpt:
      "A field recording project, a insomniac producer, and an argument about whether a city has a key signature.",
    category: "Music",
    tags: ["Field Recording", "Sound", "Night"],
    author: { name: "Selorm Agbeko", igHandle: "selorm.writes" },
    featured: false,
    daysAgo: 63,
    content: doc([
      p(
        "For eight months, a producer who records under the name Odo has been walking Accra between three and five in the morning with a portable recorder and a pair of headphones, collecting the city at the only hour it is quiet enough to hear.",
      ),
      h2("The findings"),
      p(
        "Generators, mostly. A surprising amount of birdsong. The Tema motorway producing a sustained low drone that sits, he insists, almost exactly on a low F. He has built four tracks around it.",
      ),
      quote("Every city has a hum. Ours is a machine and a bird arguing."),
      p(
        "The project raises a question worth taking seriously: what is lost when a place is only ever recorded at its loudest? Accra's international image is drums, markets, traffic — the city at full volume. The 4 a.m. recordings are unrecognisable, and completely the same place.",
      ),
      p(
        "Odo plans to release the archive freely for other producers to use. That decision, more than the music, is the story.",
      ),
    ]),
  },
];

export type SeedEvent = {
  title: string;
  slug: string;
  description: string;
  venue: string;
  city: string;
  daysFromNow: number;
  ticketUrl: string;
  featured: boolean;
};

export const SEED_EVENTS: SeedEvent[] = [
  {
    title: "Edition 02 — Launch Night",
    slug: "edition-02-launch-night",
    description:
      "We are printing a hundred copies of Edition 02 and putting them in a room with the people who made it.\n\nExpect the full roster, a short talk from the photographers, and a set from Odo built out of the 4 a.m. field recordings. Copies are free while they last; the bar is not.",
    venue: "The Studio, Osu",
    city: "Accra",
    daysFromNow: 18,
    ticketUrl: "https://example.com/tickets/edition-02",
    featured: true,
  },
  {
    title: "Listening Session — The Highlife Crate",
    slug: "listening-session-highlife-crate",
    description:
      "Four hundred records, one afternoon, no phones. We are borrowing a crate from a collector in Kaneshie and playing it front to back on a proper system.\n\nBring a notebook. We will be recording nothing, which is rather the point.",
    venue: "Alliance Française",
    city: "Accra",
    daysFromNow: 39,
    ticketUrl: "",
    featured: false,
  },
  {
    title: "Open Studio — Portfolio Reviews",
    slug: "open-studio-portfolio-reviews",
    description:
      "Twenty slots, twenty minutes each, free. Bring work in any state — prints, a phone, a half-finished edit.\n\nThis is not a competition and there is no prize. It is four people who have made a lot of mistakes looking at your work honestly.",
    venue: "Blacktivity Studio, Spintex",
    city: "Accra",
    daysFromNow: 61,
    ticketUrl: "https://example.com/tickets/open-studio",
    featured: false,
  },
  {
    title: "Exhibition — Two Hours Before Sunset",
    slug: "two-hours-before-sunset",
    description:
      "Forty portraits by Ama Serwaa Mensah, all shot on film in the last light of the day, all of people she knows.\n\nThe show ran for three weeks and we sold nothing, which was the arrangement.",
    venue: "Nubuke Foundation",
    city: "Accra",
    daysFromNow: -34,
    ticketUrl: "",
    featured: false,
  },
  {
    title: "Creative Meetup — No Slides Allowed",
    slug: "creative-meetup-no-slides",
    description:
      "Our first public gathering. Sixty people, one rule: nobody presents anything.\n\nIt turned into a four-hour argument about typography and we have not fully recovered.",
    venue: "Jamestown Café",
    city: "Accra",
    daysFromNow: -78,
    ticketUrl: "",
    featured: false,
  },
];

export type SeedSubmission = {
  name: string;
  email: string;
  igHandle: string;
  discipline: Discipline;
  workUrl: string;
  note: string;
  status: SubmissionStatus;
  daysAgo: number;
  hasImage: boolean;
};

export const SEED_SUBMISSIONS: SeedSubmission[] = [
  {
    name: "Abena Owusu",
    email: "abena.owusu@example.com",
    igHandle: "abena.shoots",
    discipline: "Photography",
    workUrl: "https://example.com/abena",
    note: "A series on the seamstresses in my grandmother's compound in Kumasi. Shot over two years on expired film.",
    status: "approved",
    daysAgo: 3,
    hasImage: true,
  },
  {
    name: "Kojo Mensah",
    email: "kojo@example.com",
    igHandle: "kojo.designs",
    discipline: "Design",
    workUrl: "https://example.com/kojo",
    note: "I have been building a display typeface based on Adinkra stroke logic. It is about sixty percent finished and I would love a second opinion.",
    status: "approved",
    daysAgo: 6,
    hasImage: true,
  },
  {
    name: "Nana Adjoa Blay",
    email: "nanaadjoa@example.com",
    igHandle: "adjoa.sound",
    discipline: "Music",
    workUrl: "https://example.com/adjoa",
    note: "Three tracks built entirely from samples of my father's church choir. He does not know yet.",
    status: "approved",
    daysAgo: 9,
    hasImage: false,
  },
  {
    name: "Ibrahim Sulemana",
    email: "ibrahim.s@example.com",
    igHandle: "ibrahim.films",
    discipline: "Film",
    workUrl: "https://example.com/ibrahim",
    note: "A nine-minute short about a night bus from Tamale to Accra. No dialogue.",
    status: "approved",
    daysAgo: 14,
    hasImage: true,
  },
  {
    name: "Akosua Frimpong",
    email: "akosua.f@example.com",
    igHandle: "akosua.styles",
    discipline: "Fashion",
    workUrl: "",
    note: "Deadstock denim reworked with archive kente. Six pieces so far, all one-offs.",
    status: "pending",
    daysAgo: 1,
    hasImage: true,
  },
  {
    name: "Daniel Ofori",
    email: "d.ofori@example.com",
    igHandle: "danofori",
    discipline: "Writing",
    workUrl: "https://example.com/daniel",
    note: "An essay about why every Accra co-working space plays the same four songs. It is funnier than it sounds.",
    status: "pending",
    daysAgo: 2,
    hasImage: false,
  },
  {
    name: "Zainab Alhassan",
    email: "zainab@example.com",
    igHandle: "zainab.makes",
    discipline: "Photography",
    workUrl: "https://example.com/zainab",
    note: "Portraits of women who run the night markets. Still shooting, but I wanted to show someone.",
    status: "pending",
    daysAgo: 4,
    hasImage: true,
  },
  {
    name: "Michael Boateng",
    email: "mboateng@example.com",
    igHandle: "",
    discipline: "Other",
    workUrl: "",
    note: "I build furniture out of pallet wood. Probably not what you are looking for but the chairs are good.",
    status: "pending",
    daysAgo: 7,
    hasImage: false,
  },
  {
    name: "Priya Raman",
    email: "priya.r@example.com",
    igHandle: "priya.visuals",
    discipline: "Design",
    workUrl: "https://example.com/priya",
    note: "Brand identity work, mostly for clients outside Ghana. Happy to share the full deck.",
    status: "rejected",
    daysAgo: 21,
    hasImage: false,
  },
  {
    name: "Growth Partners Ltd",
    email: "contact@example.com",
    igHandle: "",
    discipline: "Other",
    workUrl: "https://example.com/seo",
    note: "We can improve your website ranking with guaranteed first-page results.",
    status: "rejected",
    daysAgo: 25,
    hasImage: false,
  },
];
