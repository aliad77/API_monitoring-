import Link from "next/link";
import { PixelSprite } from "@/components/pixel/pixel-sprite";
import { mascot } from "@/components/pixel/sprites";
import { buttonStyles } from "@/components/ui/button";
import { REPOSITORY_URL } from "./hero-scene";
import styles from "./landing.module.css";

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section
      className={`${styles.scene} ${styles.ctaScene} ${styles.cta}`}
      data-scene
      aria-labelledby="cta-title"
    >
      <p
        className={`chrome-text ${styles.wordmark}`}
        data-text="PULSE"
        aria-hidden
      >
        PULSE
      </p>
      <h2 id="cta-title" className={styles.ctaTitle}>
        Keep your services in sight.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-haze-600 dark:text-haze-300">
        Free and open source. Run it locally with Docker and PostgreSQL in a
        few minutes.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={signedIn ? "/dashboard" : "/register"}
          className={buttonStyles("primary")}
        >
          {signedIn ? "Open dashboard" : "Create an account"}
        </Link>
        <a href={REPOSITORY_URL} className={buttonStyles("secondary")}>
          View the repository
        </a>
      </div>
      <div className="mt-14 flex justify-center" aria-hidden>
        <PixelSprite sprite={mascot} scale={5} />
      </div>
    </section>
  );
}
