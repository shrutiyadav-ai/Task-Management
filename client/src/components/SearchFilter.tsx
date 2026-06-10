import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  color?: string;
}

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilters: string[];
  onPriorityChange: (priorities: string[]) => void;
  assigneeFilters: string[];
  onAssigneeChange: (assignees: string[]) => void;
  labelFilters: string[];
  onLabelChange: (labels: string[]) => void;
  availableAssignees: FilterOption[];
  availableLabels: FilterOption[];
}

const priorities: FilterOption[] = [
  { id: 'LOW', label: 'Low', color: '#22c55e' },
  { id: 'MEDIUM', label: 'Medium', color: '#3b82f6' },
  { id: 'HIGH', label: 'High', color: '#f97316' },
  { id: 'URGENT', label: 'Urgent', color: '#ef4444' },
];

const FilterDropdown: React.FC<{
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}> = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
          selected.length > 0
            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-extrabold flex items-center justify-center">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`Filter by ${label}`}
          className="absolute top-full left-0 mt-2 w-48 glass-panel rounded-xl shadow-2xl border border-white/10 py-1.5 z-50 context-menu"
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleOption(opt.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition hover:bg-white/5 ${
                  isSelected ? 'text-white font-semibold' : 'text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  {opt.color && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {opt.label}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            );
          })}

          {selected.length > 0 && (
            <div className="border-t border-white/5 mt-1 pt-1">
              <button
                onClick={() => onChange([])}
                className="w-full px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition text-left"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SearchFilter: React.FC<SearchFilterProps> = ({
  searchQuery,
  onSearchChange,
  priorityFilters,
  onPriorityChange,
  assigneeFilters,
  onAssigneeChange,
  labelFilters,
  onLabelChange,
  availableAssignees,
  availableLabels,
}) => {
  const hasFilters =
    searchQuery.length > 0 ||
    priorityFilters.length > 0 ||
    assigneeFilters.length > 0 ||
    labelFilters.length > 0;

  const clearAll = () => {
    onSearchChange('');
    onPriorityChange([]);
    onAssigneeChange([]);
    onLabelChange([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-3" role="search" aria-label="Filter tasks">
      {/* Search input */}
      <div className="search-bar flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[200px] max-w-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks by title or description"
          className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="text-slate-400 hover:text-white transition"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />

        <FilterDropdown
          label="Priority"
          options={priorities}
          selected={priorityFilters}
          onChange={onPriorityChange}
        />

        {availableAssignees.length > 0 && (
          <FilterDropdown
            label="Assignee"
            options={availableAssignees}
            selected={assigneeFilters}
            onChange={onAssigneeChange}
          />
        )}

        {availableLabels.length > 0 && (
          <FilterDropdown
            label="Label"
            options={availableLabels}
            selected={labelFilters}
            onChange={onLabelChange}
          />
        )}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 transition"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
