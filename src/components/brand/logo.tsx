import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

export function Logo({ className, size = 32, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Mimzo"
      >
        <defs>
          <linearGradient id="mimzo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#mimzo-grad)" />
        <path
          d="M19 44V20l13 19 13-19v24"
          stroke="#0b0d18"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight">Mimzo</span>
      )}
    </div>
  );
}
