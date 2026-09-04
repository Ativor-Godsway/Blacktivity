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
      {/* Paper grain is public-site brand texture, not admin chrome. */}
      <Grain />
      {/* Ink on the paper ground — never a hue. */}
      <ClickSpark sparkColor="#0B0B0B" />
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
