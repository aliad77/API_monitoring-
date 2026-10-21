import type { CSSProperties, ReactNode } from "react";
import styles from "./landing.module.css";

const steps = [
  {
    title: "Add an endpoint",
    body: "Name it, paste the URL, choose GET or HEAD, the status you expect and an interval from 1 to 30 minutes.",
  },
  {
    title: "Pulse schedules the request",
    body: "A worker claims due monitors with FOR UPDATE SKIP LOCKED, validates DNS and connects only to approved public addresses.",
  },
  {
    title: "Status and latency are recorded",
    body: "Each check stores its status code, response time and any failure reason in PostgreSQL.",
  },
  {
    title: "Failures open an incident",
    body: "The first failed check opens one incident and an in-app notification. Recovery resolves it automatically.",
  },
  {
    title: "History becomes visible",
    body: "Charts, sampled uptime and incident timelines are calculated from the stored checks.",
  },
];

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.window}>
      <div className={styles.windowBar}>
        <span />
        <span />
        <span />
        <span className="ml-1 truncate">{title}</span>
        <span className={styles.sample}>Illustration</span>
      </div>
      <div className={styles.windowBody}>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fakeField}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const panels: ReactNode[] = [
  <Window key="add" title="01 / new monitor">
    <Field label="Name" value="Checkout API" />
    <Field label="URL" value="https://api.example.com/health" />
    <Field label="Interval" value="Every minute" />
  </Window>,
  <Window key="request" title="02 / scheduled check">
    <p className="font-mono text-xs">GET https://api.example.com/health</p>
    <div className={styles.packets} aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
    <p className="text-xs text-haze-500">
      DNS validated · private ranges refused · IP pinned
    </p>
  </Window>,
  <Window key="record" title="03 / result stored">
    <div className="flex items-baseline justify-between">
      <span className={styles.bigNumber}>200</span>
      <span className={styles.bigNumber}>142 ms</span>
    </div>
    <p className="text-xs text-haze-500">
      Saved as a check row with status, latency and timestamp
    </p>
  </Window>,
  <Window key="incident" title="04 / incident opened">
    <p className="flex items-center gap-2 font-semibold">
      <span className="size-2 animate-pixel-blink bg-red-500" aria-hidden />
      Checkout API is down
    </p>
    <p className="text-xs text-haze-500">Expected status 200, received 503</p>
    <p className="text-xs">In-app notification sent</p>
  </Window>,
  <Window key="history" title="05 / history">
    <div className={styles.historyBars} aria-hidden>
      {[80, 92, 88, 100, 96, 30, 100, 94, 90, 100, 97, 100].map(
        (height, index) => (
          <span
            key={index}
            style={{ height: `${height}%` }}
            data-down={height < 50 ? "" : undefined}
          />
        ),
      )}
    </div>
    <p className="text-xs text-haze-500">
      Response time per bucket, with the outage highlighted
    </p>
  </Window>,
];

export function PipelineScene() {
  return (
    <section
      id="how-it-works"
      className={`${styles.scene} ${styles.pipelineScene}`}
      data-scene
      data-steps={steps.length}
      aria-labelledby="pipeline-title"
    >
      <div className={styles.pin}>
        <div className={`${styles.container} ${styles.pipeline}`}>
          <div>
            <p className={styles.kicker}>02 · How Pulse works</p>
            <h2 id="pipeline-title" className={styles.sectionTitle}>
              From URL to <span className={styles.iridescent}>history</span>
            </h2>
            <ol className={styles.steps}>
              {steps.map((step, index) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepBody}>{step.body}</span>
                </li>
              ))}
            </ol>
            <div className={styles.rail} aria-hidden>
              {steps.map((step) => (
                <span key={step.title} />
              ))}
            </div>
          </div>

          <div className={styles.flyport} aria-hidden>
            <div
              className={styles.world}
              style={{ "--n": panels.length } as CSSProperties}
            >
              <div className={styles.floor}>
                <div className={styles.beam} />
              </div>
              {panels.map((panel, index) => (
                <div
                  key={index}
                  className={styles.flyPanel}
                  style={
                    {
                      "--i": index,
                      "--side": index % 2 === 0 ? -1 : 1,
                    } as CSSProperties
                  }
                >
                  {panel}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
