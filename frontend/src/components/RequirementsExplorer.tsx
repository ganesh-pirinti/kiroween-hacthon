import React, { useState, useMemo } from 'react';
import { Requirement } from '../types';
import { StatusBadge } from './StatusBadge';
import { Search, Filter, CheckSquare } from 'lucide-react';

interface Props {
  requirements: Requirement[];
  selectedRequirementId: string | null;
  onSelectRequirement: (id: string) => void;
}

export const RequirementsExplorer: React.FC<Props> = ({
  requirements,
  selectedRequirementId,
  onSelectRequirement,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      const matchesSearch =
        req.id.toLowerCase().includes(search.toLowerCase()) ||
        req.title.toLowerCase().includes(search.toLowerCase()) ||
        req.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requirements, search, statusFilter]);

  const filterTabs = ['ALL', 'VERIFIED', 'VIOLATION', 'BLOCKED', 'UNVERIFIED'];

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-[#242b38] rounded-lg overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-[#242b38] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#58a6ff]" />
            Requirements Catalog
          </h2>
          <span className="text-xs font-mono-code text-[#8b949e]">
            {filteredRequirements.length} of {requirements.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requirements by ID or keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#161b22] border border-[#30363d] rounded-md text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                statusFilter === tab
                  ? 'bg-[#1f6feb] text-white'
                  : 'bg-[#161b22] text-[#8b949e] hover:text-white hover:bg-[#21262d]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Requirement List */}
      <div className="divide-y divide-[#242b38] overflow-y-auto max-h-[560px]">
        {filteredRequirements.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8b949e]">
            No requirements match your current search or status filter.
          </div>
        ) : (
          filteredRequirements.map((req) => {
            const isSelected = req.id === selectedRequirementId;
            return (
              <div
                key={req.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRequirement(req.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRequirement(req.id);
                  }
                }}
                className={`p-3.5 cursor-pointer transition-colors text-left focus:outline-none ${
                  isSelected
                    ? 'bg-[#161b22] border-l-2 border-[#58a6ff]'
                    : 'hover:bg-[#161b22]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold font-mono-code text-[#58a6ff]">
                    {req.id}
                  </span>
                  <StatusBadge status={req.status} size="sm" />
                </div>
                <h3 className="mt-1 text-xs font-semibold text-white line-clamp-1">
                  {req.title}
                </h3>
                <p className="mt-1 text-[11px] text-[#8b949e] line-clamp-2 leading-relaxed">
                  {req.description}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#8b949e]">
                  <span className="flex items-center gap-1 font-mono-code text-[10px]">
                    <CheckSquare className="w-3 h-3 text-[#58a6ff]" />
                    {req.acceptance_criteria.length} criteria
                  </span>
                  <span className="text-[10px] text-[#6e7681]">
                    {req.linked_tests.length > 0 ? `${req.linked_tests.length} tests bound` : 'No test bound'}
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
