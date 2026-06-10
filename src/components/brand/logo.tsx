import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

/** Mint accent square + white block icon */
function LogoIcon({ size = 28 }: { size?: number }) {
  // Source viewBox: 27.41 × 23.63
  const ratio = 23.63 / 27.41;
  return (
    <svg
      width={size}
      height={Math.round(size * ratio)}
      viewBox="0 0 27.41 23.63"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mimzo"
      role="img"
    >
      <path
        fill="#41FEAA"
        d="M27.41 19.49c0,1.99 -1.37,3.21 -4.11,3.21l-15.71 0 0 -4.79 14.21 0 0 -13.06 -15.42 0 0 11.15 -5.5 0 -0.02 -13.3c-0,-1.67 1.44,-2.57 4.31,-2.7l18.16 0c2.54,0 3.9,0.86 4.09,2.58l0 16.91z"
      />
      <rect fill="currentColor" x="0" y="18.32" width="5.31" height="5.31" />
    </svg>
  );
}

/** Full white wordmark "MIMZO" with mint accent square */
function LogoWordmark({ height = 22 }: { height?: number }) {
  // Source viewBox: 188.56 × 27.94
  const ratio = 188.56 / 27.94;
  return (
    <svg
      height={height}
      width={Math.round(height * ratio)}
      viewBox="0 0 188.56 27.94"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mimzo"
      role="img"
    >
      <path
        fill="currentColor"
        d="M7.44 26.84l0 -13.84 7.94 13.84 5.26 0 8.31 -14.17 0 14.17 7.44 0 0 -26.8 -6.7 0 -11.66 17.59 -10.72 -17.59 -7.3 0 0 26.8 7.44 0zm41.58 -26.84l7.81 0 0 26.84 -7.81 0 0 -26.84zm27.94 26.84l0 -13.84 7.94 13.84 5.26 0 8.31 -14.17 0 14.17 7.44 0 0 -26.8 -6.7 0 -11.66 17.59 -10.72 -17.59 -7.3 0 0 26.8 7.44 0zm41.58 -5.76l0 5.76 26.94 0 0 -5.76 -17.32 0 17.32 -15.65 0 -5.39 -26.94 0 0 5.46 17.79 -0.03 -17.79 15.61z"
      />
      <path
        fill="currentColor"
        d="M188.56 23.05c0,2.35 -1.61,3.79 -4.86,3.79l-18.58 0.01 0 -5.67 16.8 0 0 -15.45 -18.23 0 0 13.18 -6.5 0 -0.03 -15.73c-0,-1.97 1.7,-3.03 5.1,-3.19l21.47 0c3,0 4.61,1.02 4.83,3.05l0 19.99z"
      />
      <rect fill="#41FEAA" x="156.16" y="21.66" width="6.27" height="6.27" />
    </svg>
  );
}

export function Logo({ className, size = 28, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {showWordmark ? (
        <LogoWordmark height={Math.round(size * 0.78)} />
      ) : (
        <LogoIcon size={size} />
      )}
    </div>
  );
}
