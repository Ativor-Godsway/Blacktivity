import { Suspense, type ReactNode } from "react";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { HairlineGridFixed } from "@/components/ui/HairlineGrid";
import Analytics from "@/components/Analytics";
import WebVitals from "@/components/WebVitals";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Grain from "@/components/ui/Grain";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Paper grain is public-site brand texture, not admin chrome. */}
      <Grain />
      <SmoothScroll />
      <HairlineGridFixed />
      <Suspense fallback={null}>
        <Analytics />
        <WebVitals />
      </Suspense>
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header />
        <PageTransition>
          <main id="main" className="flex-1">
            {children}
          </main>
        </PageTransition>
        <Footer />
      </div>
    </>
  );
}
