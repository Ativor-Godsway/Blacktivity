import type { StaticImageData } from "next/image";

import issue06 from "@/assets/covers/issue-06.jpg";
import issue05 from "@/assets/covers/issue-05.jpg";
import issue04 from "@/assets/covers/issue-04.jpg";
import issue03 from "@/assets/covers/issue-03.jpg";
import issue02 from "@/assets/covers/issue-02.jpg";
import issue01 from "@/assets/covers/issue-01.jpg";

/**
 * THE HERO COVER STACK.
 *
 * Covers are STATIC IMPORTS, not URLs. The set is fixed and known at build
 * time, so importing the files lets Next optimize them during the build and
 * generate a real `blurDataURL` for each. Remote URLs are optimized on demand
 * instead: the first visitor to hit an uncached variant pays the full resize,
 * which is what made local LCP swing between 2.4s and 4.0s.
 *
 * When the real Instagram artwork arrives:
 *   1. Drop the files into `assets/covers/` (portrait, 4:5, <= ~1100px tall).
 *   2. Update the imports above.
 *   3. Set `placeholder: false` — that switches off the generated masthead
 *      overlay and renders the artwork clean.
 * Nothing else needs to change.
 */
export type Cover = {
  issue: string;
  title: string;
  line: string;
  image: StaticImageData;
  /** True while we are standing in a photo for real cover artwork. */
  placeholder: boolean;
};

export const COVERS: Cover[] = [
  { issue: "ISSUE 06", title: "The Tailors", line: "Makola, in full", image: issue06, placeholder: true },
  { issue: "ISSUE 05", title: "Highlife", line: "The crate in Kaneshie", image: issue05, placeholder: true },
  { issue: "ISSUE 04", title: "Two Hours", line: "Before sunset", image: issue04, placeholder: true },
  { issue: "ISSUE 03", title: "The Grid", line: "Is a political object", image: issue03, placeholder: true },
  { issue: "ISSUE 02", title: "4 A.M.", line: "What Accra sounds like", image: issue02, placeholder: true },
  { issue: "ISSUE 01", title: "The Room", line: "A studio, not a brand", image: issue01, placeholder: true },
];

export default COVERS;
