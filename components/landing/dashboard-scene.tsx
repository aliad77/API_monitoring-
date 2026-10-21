import type { CSSProperties, ReactNode } from "react";
import {
  StatusBadge,
  type DisplayStatus,
} from "@/components/monitors/status-badge";
import styles from "./landing.module.css";

// Illustrative values only. The section is labelled as sample data.
const tiles = [
  { label: "Monitors", value: "6" },
  { label: "Operational", value: "5" },
  { label: "Down", value: "1" },
  { label: "Avg response", value: "186 ms" },
];

const rows: { name: string; url: string; status: DisplayStatus }[] = [
  { name: "Checkout API", url: "api.example.com/health", status: "DOWN" },
  { name: "Storefront", url: "shop.example.com", status: "UP" },
  { name: "Auth service", url: "auth.example.com/ping", status: "UP" },
  { name: "Docs", url: "docs.example.com", status: "PAUSED" },
];

// A stepped response-time series in a 100 × 40 viewBox (y grows downward).
const CHART_PATH =
  "M0 28 H8 V24 H16 V26 H24 V20 H32 V22 H40 V12 H48 V30 H56 V8 H64 V18 H72 V16 H80 V22 H88 V19 H100";

function Layer({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <div
      className={styles.boardLayer}
      style={{ "--z": `${depth}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function DashboardScene() {
  return (
    <section
      id="preview"
      className={`${styles.scene} ${styles.boardScene}`}
      data-scene
      aria-labelledby="preview-title"
    >
      <div className={styles.pin}>
        <div className={styles.container}>
          <p className={styles.kicker}>03 · The dashboard</p>
          <h2 id="preview-title" className={styles.sectionTitle}>
            Every service, <span className={styles.iridescent}>one glance</span>
          </h2>
          <p className="mt-4 max-w-xl text-haze-600 dark:text-haze-300">
            Live status, response-time charts and incident history, all
            calculated from checks stored in your database.
          </p>

          <div className={styles.boardViewport} aria-hidden>
            <div className={styles.board}>
              <div className={styles.boardSide}>
                <span aria-current="page">Dashboard</span>
                <span>Monitors</span>
                <span>Incidents</span>
                <span>Status pages</span>
                <span>Settings</span>
              </div>

              <div className={styles.boardMain}>
                <Layer depth={70}>
                  <div className={styles.boardStats}>
                    {tiles.map((tile) => (
                      <div key={tile.label} className={styles.boardTile}>
                        <p>{tile.label}</p>
                        <p>{tile.value}</p>
                      </div>
                    ))}
                  </div>
                </Layer>

                <Layer depth={40}>
                  <div className={styles.boardChart}>
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase">
                        Response time · 24 hours
                      </span>
                      <span className={styles.sample}>Sample data</span>
                    </div>
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path
                        d={CHART_PATH}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        className={styles.chartLine}
                      />
                    </svg>
                  </div>
                </Layer>

                <Layer depth={20}>
                  <div className={styles.boardRows}>
                    {rows.map((row) => (
                      <div key={row.name} className={styles.boardRow}>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          <code className="block truncate">{row.url}</code>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                    ))}
                  </div>
                </Layer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
