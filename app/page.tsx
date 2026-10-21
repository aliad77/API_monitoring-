import { DashboardScene } from "@/components/landing/dashboard-scene";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroScene } from "@/components/landing/hero-scene";
import { LandingHeader } from "@/components/landing/landing-header";
import { PipelineScene } from "@/components/landing/pipeline-scene";
import { ScrollStage } from "@/components/landing/scroll-stage";
import { SpecSheet } from "@/components/landing/spec-sheet";
import styles from "@/components/landing/landing.module.css";
import { getCurrentUserId } from "@/lib/auth/session";

export default async function HomePage() {
  const signedIn = Boolean(await getCurrentUserId());

  return (
    <ScrollStage className={`grid-canvas ${styles.stage}`}>
      <div className={styles.progress} aria-hidden />
      <LandingHeader signedIn={signedIn} />
      <main>
        <HeroScene signedIn={signedIn} />
        <PipelineScene />
        <DashboardScene />
        <SpecSheet />
        <FinalCta signedIn={signedIn} />
      </main>
      <footer className="border-t border-(--edge) px-5 py-8 text-center text-sm text-haze-500 dark:text-haze-400">
        Pulse is an open-source portfolio project. Illustrations on this page
        use sample data.
      </footer>
    </ScrollStage>
  );
}
