import {
  Activity,
  BellRing,
  Globe,
  LineChart,
  ShieldCheck,
  Timer,
} from "lucide-react";
import styles from "./landing.module.css";

const features = [
  {
    icon: Timer,
    title: "Scheduled HTTP checks",
    description:
      "GET or HEAD every 1, 5, 10 or 30 minutes, with a timeout and expected status code per endpoint.",
  },
  {
    icon: LineChart,
    title: "Response-time history",
    description:
      "Every check is stored. Charts and uptime are calculated from those recorded results.",
  },
  {
    icon: Activity,
    title: "Incident tracking",
    description:
      "An incident opens on the first failed check and closes when the endpoint recovers.",
  },
  {
    icon: BellRing,
    title: "In-app notifications",
    description:
      "Know when a monitor goes down or recovers, with read and unread state.",
  },
  {
    icon: Globe,
    title: "Public status pages",
    description:
      "Share status, uptime and incident history for selected services without exposing their URLs.",
  },
  {
    icon: ShieldCheck,
    title: "SSRF-safe by design",
    description:
      "Private, loopback and internal networks are blocked, including through redirects and DNS rebinding.",
  },
];

export function SpecSheet() {
  return (
    <section
      className="px-5 py-24"
      aria-labelledby="spec-title"
    >
      <div className={styles.container}>
        <p className={styles.kicker}>04 · Spec sheet</p>
        <h2 id="spec-title" className={styles.sectionTitle}>
          What&apos;s inside
        </h2>
        <ul className={styles.specGrid}>
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className={`glass rounded-2xl ${styles.specCard}`}>
              <span className={`pixel-frame ${styles.specIcon}`}>
                <Icon
                  className="size-5 text-lavender-deep dark:text-lavender"
                  aria-hidden
                />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-haze-600 dark:text-haze-300">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
