import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

export type ThemeId = 'light' | 'ember' | 'ultraviolet' | 'arctic' | 'emerald';

interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  swatches: string[];
}

const THEMES: ThemeOption[] = [
  {
    id: 'light',
    name: 'Enterprise Light',
    tagline: 'Clean White · Cobalt · Amber · Emerald',
    swatches: ['#F8FAFC', '#0284C7', '#D97706', '#059669'],
  },
  {
    id: 'ember',
    name: 'Obsidian Ember',
    tagline: 'Obsidian · Copper · Molten Amber · Mint',
    swatches: ['#090B0E', '#C77845', '#FFB36B', '#A7E8C5'],
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet Forensics',
    tagline: 'Deep Obsidian · Violet · Cyan · Magenta',
    swatches: ['#090B14', '#8B5CF6', '#22D3EE', '#B7F34A'],
  },
  {
    id: 'arctic',
    name: 'Arctic Intelligence',
    tagline: 'Deep Navy · Ice Cyan · Glacier Blue',
    swatches: ['#08101E', '#38BDF8', '#60A5FA', '#34D399'],
  },
  {
    id: 'emerald',
    name: 'Emerald Sentinel',
    tagline: 'Charcoal · Emerald · Champagne Gold',
    swatches: ['#080E0B', '#10B981', '#34D399', '#FDE68A'],
  },
];

interface Props {
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export const ThemeSelector: React.FC<Props> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTheme = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        data-testid="theme-selector-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="btn-command-ghost px-3 py-1.5 text-xs flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-copper)] cursor-pointer select-none"
        title="Switch Obsidian Cinematic Theme (Persisted to Local Storage)"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Palette className="w-3.5 h-3.5 text-[var(--color-molten-amber)] pointer-events-none" />
        <span className="hidden sm:inline font-mono-code text-[11px] font-semibold text-[var(--text-main)] pointer-events-none">
          {activeTheme.name.split(' ')[0]}
        </span>
        {/* Swatch Preview */}
        <div className="flex items-center -space-x-1 pointer-events-none">
          {activeTheme.swatches.slice(1, 4).map((color, idx) => (
            <span
              key={idx}
              className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-black/50"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Theme Selection Menu"
          className="absolute right-0 mt-2 w-72 p-2 rounded-2xl bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--border-panel)] shadow-[var(--panel-shadow)] z-50 animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase tracking-wider text-[var(--text-muted)] font-bold">
              THEME SELECTION
            </span>
            <span className="text-[9px] font-mono-code text-[var(--color-molten-amber)] font-bold">
              ACTIVE: {currentTheme.toUpperCase()}
            </span>
          </div>

          <div className="mt-1 space-y-1">
            {THEMES.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  data-testid={`theme-option-${theme.id}`}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onThemeChange(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-copper)]/15 border border-[var(--color-copper)]/40 shadow-[0_0_15px_rgba(var(--color-copper-rgb),0.15)]'
                      : 'hover:bg-[var(--bg-card-hover)] border border-transparent'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--color-molten-amber)] transition-colors">
                        {theme.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--color-verified)]" />
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-mono-code">
                      {theme.tagline}
                    </div>
                  </div>

                  {/* Swatches pill */}
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-black/40 px-2 py-1 rounded-lg border border-[var(--border-subtle)]">
                    {theme.swatches.slice(1).map((color, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
