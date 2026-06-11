import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

const SHIELD =
  "M46.4 65.82c-1.57,-0.52 -7.06,-6.07 -8.7,-7.74l-22.67 -0.01c2.22,5.11 25.98,28.72 31.58,28.74 5.59,0.01 29.33,-23.56 31.58,-28.74l-22.67 0c-1,1.42 -8.14,8.08 -9.13,7.75zm46.82 -65.82l-27 0c-2.02,4.12 -14.76,17.57 -19.61,19.83 -4.72,-2.2 -17.37,-15.17 -19.6,-19.82l-27 -0.01c0.02,16.97 0.59,28.71 7.36,44.2 0.68,1.55 1.92,3.71 2.38,5.11l20.55 -0 -4.07 -6.75c-3.4,-6.42 -7.71,-17.45 -7.93,-24.69 0.18,0.22 0.38,0.34 0.62,0.64l2.2 2.59c4.08,3.92 4.48,4.93 9.96,9.28 2.35,1.87 4.76,3.69 7.46,5.37 0.89,0.55 7.56,4.66 8.07,4.66 0.5,0 7.08,-4.05 7.96,-4.6 2.76,-1.72 5.07,-3.46 7.47,-5.36 2.42,-1.91 4.78,-3.99 6.82,-6.01l6.07 -6.57c-0.22,6.99 -4.45,18.2 -7.87,24.57l-4.13 6.85 20.55 0.02c0.39,-1.18 1.31,-2.7 1.87,-3.98 0.65,-1.49 1.2,-2.78 1.79,-4.26 5.64,-14.05 6.06,-25.71 6.08,-41.08z";

/** Mimzo shield mark (mint). */
function LogoIcon({ size = 28 }: { size?: number }) {
  const ratio = 86.8 / 93.5;
  return (
    <svg
      width={size}
      height={Math.round(size * ratio)}
      viewBox="0 0 93.5 86.8"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mimzo"
      role="img"
    >
      <path fill="#41FEAA" d={SHIELD} />
    </svg>
  );
}

/** Shield + "MIMZO" wordmark (letters follow currentColor). */
function LogoWordmark({ height = 22 }: { height?: number }) {
  const ratio = 371.38 / 86.8;
  return (
    <svg
      height={height}
      width={Math.round(height * ratio)}
      viewBox="0 0 371.38 86.8"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mimzo"
      role="img"
    >
      <path fill="#41FEAA" d={SHIELD} />
      <g fill="currentColor">
        <polygon points="143.98,56.28 143.98,39.09 153.84,56.28 160.38,56.28 170.7,38.68 170.7,56.28 179.94,56.28 179.94,22.98 171.61,22.98 157.13,44.84 143.81,22.98 134.73,22.98 134.73,56.28 " />
        <polygon points="196.23,22.94 205.93,22.94 205.93,56.28 196.23,56.28 " />
        <polygon points="231.54,56.28 231.54,39.09 241.4,56.28 247.94,56.28 258.26,38.68 258.26,56.28 267.5,56.28 267.5,22.98 259.18,22.98 244.69,44.84 231.37,22.98 222.3,22.98 222.3,56.28 " />
        <polygon points="283.79,49.12 283.79,56.28 317.26,56.28 317.26,49.12 295.74,49.12 317.26,29.68 317.26,22.98 283.79,22.98 283.79,29.77 305.89,29.73 " />
        <path d="M371.38 51.57c0,2.92 -2.01,4.49 -6.04,4.71 -3.55,0.03 -12.93,0.03 -28.14,0 -3,0 -4.61,-1.61 -4.83,-4.84 0.06,-4.06 0.06,-12.24 0,-24.54 0,-2.45 2.11,-3.77 6.33,-3.96l26.67 0c3.73,0 5.72,1.26 6,3.79l0 24.84zm-8.24 -2.32l0 -19.19 -22.64 0 0 19.19 22.64 0z" />
      </g>
    </svg>
  );
}

export function Logo({ className, size = 28, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      {showWordmark ? (
        <LogoWordmark height={Math.round(size * 0.7)} />
      ) : (
        <LogoIcon size={size} />
      )}
    </div>
  );
}
