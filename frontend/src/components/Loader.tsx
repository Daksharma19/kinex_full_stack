/**
 * Branded loading animation — the Kinex house/therapist mark with an animated
 * tracing line. Use anywhere data is being fetched.
 *
 *  - inline (default): centered block with padding, drops into a card/section.
 *  - fullScreen: fixed overlay that fills the viewport.
 */
interface LoaderProps {
  label?: string;
  fullScreen?: boolean;
  size?: number;
  className?: string;
}

function KinexMark({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Loading"
    >
      <defs>
        <linearGradient id="kinexTraceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0D7377" stopOpacity="0" />
          <stop offset="50%" stopColor="#14b8bd" stopOpacity="1" />
          <stop offset="100%" stopColor="#0D7377" stopOpacity="0" />
        </linearGradient>
        <filter id="kinexGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base logo (ghosted) */}
      <g fill="none" opacity="0.2" stroke="#0D7377" strokeWidth="2">
        <path
          d="M40 100 L100 40 L160 100 M145 100 L145 70 L155 70 L155 100"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="85" r="10" />
        <path d="M85 110 Q100 95 115 110" strokeLinecap="round" />
        <rect x="65" y="135" width="70" height="6" rx="3" />
        <path d="M65 141 L65 150 M135 141 L135 150" strokeLinecap="round" />
      </g>

      {/* Animated tracing line */}
      <g filter="url(#kinexGlow)">
        <path
          d="M40 100 L100 40 L160 100 L160 160 L40 160 Z"
          fill="none"
          stroke="url(#kinexTraceGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="100 400"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="500"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M65 135 L135 135"
          fill="none"
          stroke="#14b8bd"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="20 50"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="70"
            to="0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
}

export default function Loader({
  label = "Loading…",
  fullScreen = false,
  size = 96,
  className = "",
}: LoaderProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <KinexMark size={size} />
      {label && (
        <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="flex w-full items-center justify-center py-12">{content}</div>;
}
