import "./landing.css";
import { Navbar } from "@/components/Navbar";
import { HeroContent } from "@/components/marketing/HeroContent";
import { HeroPipelineDiagram } from "@/components/marketing/HeroPipelineDiagram";
import { TrustBar } from "@/components/marketing/TrustBar";
import { DemoPreview } from "@/components/marketing/DemoPreview";
import {
  PipelineSection,
  AgentsSection,
  PerformanceSection,
  SecuritySection,
  CtaSection,
  LandingFooter,
} from "@/components/marketing/LandingSections";

export default function HomePage() {
  return (
    <div className="lp-page min-h-screen bg-bg">
      <div className="lp-shell">
        <Navbar marketing />

        <section className="lp-hero" id="hero">
          <div className="lp-hero__gradient" aria-hidden />
          <div className="lp-hero__inner">
            <HeroContent />
            <HeroPipelineDiagram />
          </div>
        </section>

        <TrustBar />
        <PipelineSection />
        <AgentsSection />
        <PerformanceSection />
        <SecuritySection />
        <DemoPreview />
        <CtaSection />
        <LandingFooter />
      </div>
    </div>
  );
}