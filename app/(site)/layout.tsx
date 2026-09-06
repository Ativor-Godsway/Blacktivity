import { Suspense, type ReactNode } from "react";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import { HairlineGridFixed } from "@/components/ui/HairlineGrid";
import Analytics from "@/components/Analytics";
import WebVitals from "@/components/WebVitals";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Grain from "@/components/ui/Grain";
import ClickSpark from "@/components/interactive/ClickSpark";
import PageTransition from "@/components/motion/PageTransition";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/*
        THE HERO PIN GATE — Revision 15 §2/§3.

        This runs BEFORE FIRST PAINT, which is the only reason CLS stays at
        zero. The pin gives the hero a 160svh spacer; if the class that turns
        it on arrived on hydration instead, every section below the hero would
        jump 60svh once React came up. Setting it here means the spacer's
        height is part of the very first layout.

        It is also the no-JS story in three lines: with scripting off the class
        never appears, so there is no spacer, no sticky, no fixed header and no
        hidden wordmark — the hero renders resting and the page scrolls
        normally. Everything about the pin is expressed as a descendant of this
        class for exactly that reason.

        The three conditions are the ones §3 and §4 set: the homepage only, at
        768px and up, and not under prefers-reduced-motion. HeroScroll keeps
        the class in sync afterwards, including across client-side navigations
        and viewport changes.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(location.pathname==="/"&&innerWidth>=768&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("hero-pin")}}catch(e){}',
        }}
      />
      {/* Paper grain is public-site brand texture, not admin chrome. */}
      <Grain />
      {/* Ink on the sand ground — never a hue. */}
      <ClickSpark sparkColor="#2A211A" />
      <SmoothScroll />
      <HairlineGridFixed />
      <Suspense fallback={null}>
        <Analytics />
        <WebVitals />
      </Suspense>
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header />
        <main id="main" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </div>
    </>
  );
}
