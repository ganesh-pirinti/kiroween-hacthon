import React from 'react';

interface Props {
  isBusy?: boolean;
  verifiedPercentage?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ForensicShieldCore: React.FC<Props> = ({
  isBusy = false,
  verifiedPercentage = 0,
  size = 'md',
}) => {
  const dimension = {
    sm: 52,
    md: 68,
    lg: 84,
  }[size];

  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none"
      style={{ width: dimension, height: dimension }}
      title={
        isBusy
          ? 'Forensic Evidence Engine: Verification Pipeline Active'
          : `Forensic Evidence Core: ${verifiedPercentage}% Certified`
      }
      aria-label="Obsidian Ember Holographic Forensic Shield Core"
    >
      {/* 1. Ambient Volumetric Glow Core */}
      <div
        className={`absolute inset-1 rounded-full filter blur-md transition-all duration-700 pointer-events-none ${
          isBusy
            ? 'opacity-85 scale-125'
            : 'opacity-50 scale-100'
        }`}
        style={{
          background: 'radial-gradient(circle, var(--color-molten-amber) 0%, var(--color-copper) 45%, transparent 75%)',
        }}
      />

      {/* 2. Layer 1: Outer Rotating Holographic Wireframe Hex-Ring */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none ${
          isBusy ? 'animate-shield-active' : 'animate-shield-cw'
        }`}
        viewBox="0 0 100 100"
        fill="none"
      >
        <defs>
          <linearGradient id="shieldEmberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-copper)" stopOpacity="0.85" />
            <stop offset="50%" stopColor="var(--color-molten-amber)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-champagne)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Outer Circular Ring with Dashed Tech Segmenting */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="url(#shieldEmberGradient)"
          strokeWidth="1.3"
          strokeDasharray="4 6 14 6"
          opacity="0.9"
        />

        {/* Outer Cardinal Tech Calibrations */}
        <path d="M 50 2 L 50 7" stroke="var(--color-molten-amber)" strokeWidth="1.5" />
        <path d="M 50 93 L 50 98" stroke="var(--color-molten-amber)" strokeWidth="1.5" />
        <path d="M 2 50 L 7 50" stroke="var(--color-copper)" strokeWidth="1.5" />
        <path d="M 93 50 L 98 50" stroke="var(--color-copper)" strokeWidth="1.5" />

        {/* Diagonal Tech Nodes */}
        <circle cx="17" cy="17" r="1.5" fill="var(--color-champagne)" />
        <circle cx="83" cy="17" r="1.5" fill="var(--color-molten-amber)" />
        <circle cx="83" cy="83" r="1.5" fill="var(--color-copper)" />
        <circle cx="17" cy="83" r="1.5" fill="var(--color-verified)" />
      </svg>

      {/* 3. Layer 2: Middle Counter-Rotating Gyroscope Crosshair Ring */}
      <svg
        className={`absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none ${
          isBusy ? 'animate-shield-active' : 'animate-shield-ccw'
        }`}
        viewBox="0 0 80 80"
        fill="none"
      >
        {/* Precision Octagon / Diamond Wireframe */}
        <polygon
          points="40,6 64,16 74,40 64,64 40,74 16,64 6,40 16,16"
          stroke="var(--color-molten-amber)"
          strokeWidth="0.8"
          strokeDasharray="2 3"
          opacity="0.75"
        />

        {/* Angular Coordinate Ticks */}
        <line x1="40" y1="12" x2="40" y2="18" stroke="var(--color-copper)" strokeWidth="1" />
        <line x1="40" y1="62" x2="40" y2="68" stroke="var(--color-copper)" strokeWidth="1" />
        <line x1="12" y1="40" x2="18" y2="40" stroke="var(--color-champagne)" strokeWidth="1" />
        <line x1="62" y1="40" x2="68" y2="40" stroke="var(--color-champagne)" strokeWidth="1" />

        {/* Orbiting Energy Ring */}
        <circle
          cx="40"
          cy="40"
          r="26"
          stroke="var(--color-copper)"
          strokeWidth="0.6"
          strokeOpacity="0.45"
        />
      </svg>

      {/* 4. Layer 3: Central Crystalline Shield Glyph */}
      <div
        className={`relative z-10 flex items-center justify-center p-2 rounded-2xl bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-card)] border border-[var(--border-panel)] shadow-sm backdrop-blur-md ${
          isBusy ? 'animate-shield-pulse' : 'animate-shield-pulse'
        }`}
      >
        <svg
          className="w-5 h-5 transition-transform duration-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <linearGradient id="shieldGlyphEmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-molten-amber)" />
              <stop offset="100%" stopColor="var(--color-copper)" />
            </linearGradient>
          </defs>
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke="url(#shieldGlyphEmberGrad)"
            fill="rgba(var(--color-copper-rgb), 0.18)"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="var(--color-verified)"
            strokeWidth="2.2"
          />
        </svg>

        {/* Live Activity Beacon Pip */}
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isBusy ? 'bg-[var(--color-molten-amber)]' : 'bg-[var(--color-verified)]'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isBusy ? 'bg-[var(--color-molten-amber)]' : 'bg-[var(--color-verified)]'
            }`}
          />
        </span>
      </div>
    </div>
  );
};
