import type { CSSProperties, ReactNode } from "react";
import { PixelPulse } from "@/components/pixel/pixel-pulse";
import { PixelSprite } from "@/components/pixel/pixel-sprite";
import { cloud, heart, sparkle, type Sprite } from "@/components/pixel/sprites";
import styles from "./landing.module.css";

/** A cuboid made of six faces; size comes from --bw/--bh/--bd in CSS. */
function Box({
  className,
  children,
}: {
  className: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${styles.box} ${styles.chromeBox} ${className}`}>
      <div className={`${styles.face} ${styles.faceBack}`} />
      <div className={`${styles.face} ${styles.faceLeft}`} />
      <div className={`${styles.face} ${styles.faceRight}`} />
      <div className={`${styles.face} ${styles.faceTop}`} />
      <div className={`${styles.face} ${styles.faceBottom}`} />
      <div className={`${styles.face} ${styles.faceFront}`}>{children}</div>
    </div>
  );
}

type ChipPosition = { x: string; y: string; z: string };

function Chip({
  position,
  optional = false,
  children,
}: {
  position: ChipPosition;
  optional?: boolean;
  children: ReactNode;
}) {
  const style = {
    "--x": position.x,
    "--y": position.y,
    "--z": position.z,
  } as CSSProperties;
  return (
    <div
      className={`${styles.chip} ${optional ? styles.chipOptional : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

const orbiters: { sprite: Sprite; angle: string; lift: string }[] = [
  { sprite: sparkle, angle: "0deg", lift: "-150px" },
  { sprite: heart, angle: "130deg", lift: "-40px" },
  { sprite: cloud, angle: "250deg", lift: "-110px" },
];

const sampleRows = [
  { host: "api.example.com", result: "200 · 142ms", led: "var(--color-acid)" },
  { host: "shop.example.com", result: "200 · 88ms", led: "var(--color-acid)" },
  { host: "auth.example.com", result: "503", led: "var(--color-candy)" },
];

/**
 * The hero's 3D monitoring station: a chrome CRT on a stand, with interface
 * panels floating at different depths. Built from CSS boxes instead of WebGL,
 * so it costs no extra JavaScript. Decorative: hidden from assistive tech.
 */
export function MonitorStation() {
  return (
    <figure>
      <div className={styles.station} aria-hidden>
        <div className={styles.rig}>
          <div className={styles.float}>
            <Box className={styles.monitor}>
              <div className={styles.bezel}>
                <div className={styles.screen}>
                  <div className={styles.screenHeader}>
                    <span>pulse://monitor</span>
                    <span className="animate-pixel-blink">● live</span>
                  </div>
                  <PixelPulse className={styles.screenTrace} />
                  {sampleRows.map((row) => (
                    <div key={row.host} className={styles.screenRow}>
                      <span
                        className={styles.led}
                        style={{ background: row.led }}
                      />
                      <span>{row.host}</span>
                      <span>{row.result}</span>
                    </div>
                  ))}
                </div>
              </div>
              <span className={styles.brandPlate}>PULSE</span>
            </Box>
            <Box className={styles.neck} />
            <Box className={styles.base} />

            <Chip position={{ x: "190px", y: "-120px", z: "90px" }}>
              <span
                className={styles.led}
                style={{ background: "var(--color-acid)" }}
              />
              200 OK
              <span className={styles.chipLabel}>142 ms</span>
            </Chip>
            <Chip position={{ x: "-175px", y: "10px", z: "140px" }}>
              <PixelSprite sprite={heart} scale={2} />
              Incident resolved
            </Chip>
            <Chip optional position={{ x: "175px", y: "120px", z: "60px" }}>
              <span className={styles.chipLabel}>Uptime</span>
              <span className={styles.miniBars}>
                {[70, 90, 80, 100, 95, 40, 100, 90].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </span>
            </Chip>
            <Chip optional position={{ x: "-150px", y: "-150px", z: "170px" }}>
              <span className="chrome-text font-display text-base font-black">
                PULSE
              </span>
            </Chip>

            <div className={styles.orbit}>
              {orbiters.map(({ sprite, angle, lift }) => (
                <div
                  key={angle}
                  className={styles.orbiter}
                  style={{ "--angle": angle, "--lift": lift } as CSSProperties}
                >
                  <PixelSprite sprite={sprite} scale={3} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className={styles.stationCaption}>
        Illustration · sample data
      </figcaption>
    </figure>
  );
}
