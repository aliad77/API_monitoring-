import { ArrowDown, Code } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { MonitorStation } from "./monitor-station";
import styles from "./landing.module.css";

export const REPOSITORY_URL = "https://github.com/aliad77/API_monitoring-";

export function HeroScene({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className={`${styles.scene} ${styles.heroScene}`}
      data-scene
      data-steps={2}
      aria-labelledby="hero-title"
    >
      <div className={styles.pin}>
        <div className={`${styles.container} ${styles.hero}`}>
          <div className={styles.heroText}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>
                <span className={styles.kickerDot} aria-hidden />
                Uptime + API monitoring
              </p>
              <h1 id="hero-title" className={styles.headline}>
                Your APIs.
                <br />
                <span className={styles.iridescent}>Always in the loop.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-haze-600 dark:text-haze-300">
                Pulse checks your websites and APIs on a schedule, records
                every status code and response time, and opens an incident the
                moment something goes down.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {signedIn ? (
                  <Link href="/dashboard" className={buttonStyles("primary")}>
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className={buttonStyles("primary")}>
                      Get started
                    </Link>
                    <Link href="/login" className={buttonStyles("secondary")}>
                      Sign in
                    </Link>
                  </>
                )}
                <a href={REPOSITORY_URL} className={buttonStyles("ghost")}>
                  <Code className="size-4" aria-hidden />
                  View source
                </a>
              </div>
            </div>

            <div className={styles.heroInside}>
              <p className={styles.kicker}>01 · Inside the loop</p>
              <h2 className={styles.insideTitle}>
                Every check runs on a validated, pinned connection.
              </h2>
              <p className="mt-4 max-w-lg text-haze-600 dark:text-haze-300">
                A separate worker claims due monitors from PostgreSQL, resolves
                DNS, refuses private and internal addresses, then records the
                result. The web app itself never calls your endpoints.
              </p>
            </div>
          </div>

          <MonitorStation />
        </div>

        <p className={styles.scrollCue} aria-hidden>
          Scroll
          <ArrowDown className="size-4" />
        </p>
      </div>
    </section>
  );
}
