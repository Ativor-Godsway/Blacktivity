/**
 * All placeholder imagery lives here so swapping in real work is a five-minute
 * job — replace the URLs, nothing else.
 */
export const PLACEHOLDER_IMAGES = {
  articles: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1400&h=1750&fit=crop",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1400&h=1750&fit=crop",
  ],
  events: [
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=1600&fit=crop",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&h=1600&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=1600&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=1600&fit=crop",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=1600&fit=crop",
  ],
  /**
   * Rotation. Square crops — album art is square, and the 64px slots on the
   * New Music rows are the only square imagery on the site.
   */
  artwork: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1458560871784-56d23406c091?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1499415479124-43c32433a620?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1462965326201-d02e4f455804?w=400&h=400&fit=crop",
  ],
  /** Curator portraits — 4:5, matching the site's portrait ratio. */
  curators: [
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1000&h=1250&fit=crop",
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1000&h=1250&fit=crop",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1000&h=1250&fit=crop",
  ],
  submissions: [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&h=1333&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&h=1333&fit=crop",
    "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=1000&h=1333&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1000&h=1333&fit=crop",
    "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=1000&h=1333&fit=crop",
  ],
} as const;

/** A 1x1 neutral-grey blur so cards never shift while loading. */
export const NEUTRAL_BLUR =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
