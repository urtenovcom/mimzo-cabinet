import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

/**
 * Mimzo shield mark — mint shield whose top forms an "M" (two peaks)
 * and whose lower half resolves into a downward arrow.
 */
function LogoIcon({ size = 28 }: { size?: number }) {
  // square-ish viewBox
  const ratio = 128 / 120;
  return (
    <svg
      width={size}
      height={Math.round(size * ratio)}
      viewBox="0 0 120 128"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mimzo"
      role="img"
    >
      <path
        fill="#41FEAA"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 2 H116 V54 C116 91 94 113 60 127 C26 113 4 91 4 54 Z
           M36 2 L60 46 L84 2 Z
           M16 58 L60 95 L104 58 L104 73 L60 110 L16 73 Z"
      />
    </svg>
  );
}

/** Shield mark + "MIMZO" wordmark */
function LogoWordmark({ height = 22 }: { height?: number }) {
  return (
    <span className="inline-flex items-center" style={{ gap: height * 0.45 }}>
      <LogoIcon size={Math.round(height * 1.18)} />
      <span
        className="font-extrabold leading-none text-foreground"
        style={{
          fontSize: height,
          letterSpacing: height * 0.18,
          paddingLeft: height * 0.05,
        }}
      >
        MIMZO
      </span>
    </span>
  );
}

export function Logo({ className, size = 28, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      {showWordmark ? (
        <LogoWordmark height={Math.round(size * 0.74)} />
      ) : (
        <LogoIcon size={size} />
      )}
    </div>
  );
}
