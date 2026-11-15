import React, { useState, useMemo } from 'react';
import { Requirement } from '../types';
import { StatusBadge } from './StatusBadge';
import { Search, Filter, CheckSquare, AlertTriangle, X, Terminal } from 'lucide-react';

interface Props {
  requirements: Requirement[];
  selectedRequirementId: string | null;
  onSelectRequirement: (id: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (filter: string) => void;
}

export const RequirementsExplorer: React.FC<Props> = ({
  requirements,
  selectedRequirementId,
  onSelectRequirement,
  statusFilter: propStatusFilter,
  onStatusFilterChange,
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('ALL');

  const statusFilter = propStatusFilter !== undefined ? propStatusFilter : internalStatusFilter;

  const handleSetStatusFilter = (tab: string) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(tab);
    } else {
      setInternalStatusFilter(tab);
    }
  };

  const handleResetFilters = () => {
    setInternalSearch('');
    handleSetStatusFilter('ALL');
  };

  const filteredRequirements = useMemo(() => {
    const q = internalSearch.trim().toLowerCase();
    return requirements.filter((req) => {
      const matchesSearch =
        !q ||
        req.id.toLowerCase().includes(q) ||
        req.title.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q) ||
        req.linked_tests.some((t) => t.toLowerCase().includes(q)) ||
        req.acceptance_criteria.some(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            (c.linked_test && c.linked_test.toLowerCase().includes(q))
        );

      const matchesStatus =
        statusFilter === 'ALL' || req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requirements, internalSearch, statusFilter]);

  const filterTabs = ['ALL', 'VERIFIED', 'VIOLATION', 'BLOCKED', 'UNVERIFIED'];
  const isFiltered = internalSearch.length > 0 || statusFilter !== 'ALL';

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-[var(--border-subtle)] space-y-3.5 bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--color-copper)]/15 border border-[var(--color-copper)]/30 text-[var(--color-molten-amber)]">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold font-mono-code uppercase tracking-wider text-[var(--text-main)]">
              Specifications Catalog
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code text-[var(--text-secondary)] bg-[var(--bg-canvas)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
              {filteredRequirements.length} / {requirements.length}
            </span>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-[var(--color-molten-amber)] hover:underline flex items-center gap-0.5"
                title="Reset all search and status filters"
              >
                <X className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search input with obsidian styling */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder="Search requirements, specifications, or test targets..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border-panel)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-molten-amber)]/70 focus:bg-[var(--bg-card-hover)] focus:shadow-[0_0_15px_rgba(var(--color-molten-amber-rgb),0.15)] transition-all font-sans"
          />
          {internalSearch && (
            <button
              onClick={() => setInternalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              title="Clear search text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleSetStatusFilter(tab)}
              className={`px-2.5 py-1 text-[10px] font-mono-code font-bold rounded-lg transition-all focus:outline-none ${
                statusFilter === tab
                  ? 'bg-gradient-to-r from-[var(--color-copper)]/35 to-[var(--color-molten-amber)]/25 text-[var(--text-main)] border border-[var(--color-molten-amber)]/60 shadow-[0_0_12px_rgba(var(--color-molten-amber-rgb),0.25)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Requirement List */}
      <div
        className="divide-y divide-[var(--border-subtle)] overflow-y-auto max-h-[580px] p-2 space-y-1.5"
        role="feed"
        aria-label="Requirements List"
      >
        {filteredRequirements.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-3">
            <p>No specifications match your search query or filter.</p>
            <button
              onClick={handleResetFilters}
              className="btn-command-ghost px-3 py-1.5 text-xs text-[var(--color-molten-amber)]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredRequirements.map((req) => {
            const isSelected = req.id === selectedRequirementId;
            const uncoveredCriteriaCount = req.acceptance_criteria.filter(
              (c) => !c.linked_test || !c.linked_test.trim()
            ).length;

            return (
              <div
                key={req.id}
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
                aria-label={`Select requirement ${req.id}: ${req.title}`}
                onClick={() => onSelectRequirement(req.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRequirement(req.id);
                  }
                }}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all text-left relative overflow-hidden group ${
                  isSelected
                    ? 'bg-gradient-to-r from-[var(--color-copper)]/20 via-[var(--bg-card)] to-[var(--bg-card)] border border-[var(--color-molten-amber)]/60 shadow-[0_4px_24px_-6px_rgba(var(--color-molten-amber-rgb),0.3)]'
                    : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-panel)]'
                }`}
              >
                {/* Active Indicator Beam with Molten Amber */}
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-[var(--color-molten-amber)] shadow-[0_0_12px_var(--color-molten-amber)]" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs font-bold font-mono-code transition-colors ${
                    isSelected ? 'text-[var(--color-molten-amber)]' : 'text-[var(--color-copper)]'
                  }`}>
                    {req.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {uncoveredCriteriaCount > 0 && (
                      <span
                        className="flex items-center gap-1 text-[9px] font-bold font-mono-code text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 py-0.5 rounded-full border border-[var(--color-warning)]/30"
                        title={`${uncoveredCriteriaCount} criteria without bound test`}
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {uncoveredCriteriaCount} GAP
                      </span>
                    )}
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                </div>

                <h3 className="mt-1.5 text-xs font-semibold text-[var(--text-main)] line-clamp-1 group-hover:text-[var(--color-molten-amber)] transition-colors">
                  {req.title}
                </h3>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {req.description}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5 font-mono-code text-[10px] text-[var(--text-secondary)]">
                    <CheckSquare className="w-3 h-3 text-[var(--color-copper)]" />
                    {req.acceptance_criteria.length} criteria
                  </span>
                  <span className="flex items-center gap-1 font-mono-code text-[10px] text-[var(--text-muted)]">
                    <Terminal className="w-3 h-3 text-[var(--text-muted)]" />
                    {req.linked_tests.length > 0
                      ? `${req.linked_tests.length} test${req.linked_tests.length > 1 ? 's' : ''} bound`
                      : 'Unbound'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
