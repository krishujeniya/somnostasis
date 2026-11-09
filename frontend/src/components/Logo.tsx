import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 36, showText = true }) => {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          <radialGradient id="logo-bg" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#14211d" />
            <stop offset="100%" stopColor="#080b09" />
          </radialGradient>
          <linearGradient id="logo-brand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric Base Badge */}
        <rect
          width="512"
          height="512"
          rx="128"
          fill="url(#logo-bg)"
          stroke="#10b981"
          strokeOpacity="0.25"
          strokeWidth="6"
        />

        {/* Circadian Orbit Ring */}
        <circle
          cx="256"
          cy="256"
          r="164"
          fill="none"
          stroke="#10b981"
          strokeWidth="3.5"
          strokeDasharray="16 12"
          opacity="0.4"
        />

        {/* Sleep Biosignal Waveform */}
        <path
          d="M 120 256 C 160 256, 180 256, 204 256 C 220 256, 230 148, 246 148 C 258 148, 268 364, 282 364 C 294 364, 304 232, 318 232 C 328 232, 336 256, 350 256 C 368 256, 388 256, 392 256"
          fill="none"
          stroke="url(#logo-brand)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#logo-glow)"
        />

        {/* Neural Signal Peaks */}
        <circle cx="246" cy="148" r="9" fill="#ecfdf5" filter="url(#logo-glow)" />
        <circle cx="282" cy="364" r="9" fill="#10b981" filter="url(#logo-glow)" />
        <circle cx="318" cy="232" r="8" fill="#34d399" />

        {/* Homeostasis Telemetry Indicator */}
        <circle cx="375" cy="137" r="14" fill="#10b981" fillOpacity="0.85" />
        <circle cx="375" cy="137" r="24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeOpacity="0.5" />
      </svg>

      {showText && (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-white font-sans">
              Somnostasis
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              MLOps SaaS
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-normal">Autonomic Biosignal Intelligence</p>
        </div>
      )}
    </div>
  );
};
