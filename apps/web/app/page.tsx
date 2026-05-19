import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Pipeline } from "@/components/landing/pipeline";
import { ProblemsSection } from "@/components/landing/problems-section";
import { Nav } from "@/components/nav";
import { WhiteboardLoopSection } from "@/components/storyboard";

export default function Page() {
  return (
    <>
      <Nav showAnchors />
      <Hero />
      <Pipeline />
      <ProblemsSection />
      <WhiteboardLoopSection />
      <FinalCTA />
      <Footer />
    </>
  );
}
