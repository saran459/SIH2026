import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, MapPin, Check, Plus, Loader2, X, ChevronDown, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

export interface CollegeItem {
  id: number;
  name: string;
  aicte_permanent_id: string;
  institution_type?: string;
  district?: string;
  city?: string;
  state?: string;
  address?: string;
  women_institution?: string;
  minority_institution?: string;
}

interface CollegeSearchSelectProps {
  value?: number | string | null;
  selectedCollege?: CollegeItem | null;
  onSelect: (college: CollegeItem) => void;
  placeholder?: string;
  theme?: 'dark' | 'light';
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  allowManualEntry?: boolean;
}

export const CollegeSearchSelect: React.FC<CollegeSearchSelectProps> = ({
  value,
  selectedCollege,
  onSelect,
  placeholder = 'Type 2+ letters to search AICTE institutions...',
  theme = 'light',
  label,
  required = false,
  disabled = false,
  error,
  allowManualEntry = true
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<CollegeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Current selection state
  const [currentSelection, setCurrentSelection] = useState<CollegeItem | null>(selectedCollege || null);

  // Manual entry modal / inline state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualDistrict, setManualDistrict] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualAicteId, setManualAicteId] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Sync selectedCollege prop if passed or changed
  useEffect(() => {
    if (selectedCollege) {
      setCurrentSelection(selectedCollege);
    }
  }, [selectedCollege]);

  // If value is provided as ID but no selectedCollege, fetch details
  useEffect(() => {
    if (value && typeof value === 'number' && (!currentSelection || currentSelection.id !== value)) {
      api.getInstitution(value)
        .then((inst: any) => {
          if (inst) {
            setCurrentSelection({
              id: inst.id,
              name: inst.name,
              aicte_permanent_id: inst.aicte_permanent_id || '',
              district: inst.district || inst.city || '',
              city: inst.city || '',
              state: inst.state || '',
              institution_type: inst.institution_type || ''
            });
          }
        })
        .catch(() => {});
    }
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasMore(false);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const resp = await api.searchInstitutions({ q: trimmed, page: 1, limit: 20 });
        setResults(resp.items || []);
        setHasMore(resp.has_more || false);
        setTotalCount(resp.total || 0);
        setPage(1);
      } catch (err) {
        console.error('Failed to search colleges:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  // Load more pages if user scrolls or clicks "Load More"
  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const resp = await api.searchInstitutions({ q: query.trim(), page: nextPage, limit: 20 });
      setResults(prev => [...prev, ...(resp.items || [])]);
      setHasMore(resp.has_more || false);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more colleges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollege = (item: CollegeItem) => {
    setCurrentSelection(item);
    setIsOpen(false);
    setQuery('');
    onSelect(item);
  };

  const handleClearSelection = () => {
    setCurrentSelection(null);
    setQuery('');
    setIsOpen(true);
  };

  const handleSaveManualInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setManualSubmitting(true);
    try {
      const created = await api.createManualInstitution({
        name: manualName.trim(),
        aicte_permanent_id: manualAicteId.trim() || undefined,
        district: manualDistrict.trim() || undefined,
        city: manualDistrict.trim() || undefined,
        state: manualState.trim() || undefined
      });

      const collegeItem: CollegeItem = {
        id: created.id,
        name: created.name,
        aicte_permanent_id: created.aicte_permanent_id,
        district: (created as any).district || created.city || '',
        city: created.city || '',
        state: created.state || '',
        institution_type: created.institution_type || 'Private-Self Financed'
      };

      setCurrentSelection(collegeItem);
      setShowManualForm(false);
      setIsOpen(false);
      setQuery('');
      onSelect(collegeItem);
    } catch (err: any) {
      alert(`Could not save manual college: ${err.message || 'Error'}`);
    } finally {
      setManualSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Selected College Card Display */}
      {currentSelection ? (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            isDark
              ? 'bg-slate-800/90 border-emerald-500/50 text-white shadow-xs'
              : 'bg-emerald-50/70 border-emerald-300 text-slate-800 shadow-2xs'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start gap-2.5 min-w-0 pr-2">
            <Building2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <div className="min-w-0">
              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                <span>{currentSelection.name}</span>
                {currentSelection.aicte_permanent_id && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                      isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    ID: {currentSelection.aicte_permanent_id}
                  </span>
                )}
              </div>
              <div className={`text-[11px] truncate flex items-center gap-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {(currentSelection.district || currentSelection.city || currentSelection.state) && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 inline text-slate-400" />
                    {[currentSelection.district || currentSelection.city, currentSelection.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {currentSelection.institution_type && (
                  <span className="hidden sm:inline">• {currentSelection.institution_type}</span>
                )}
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClearSelection}
              className={`shrink-0 p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="Change College"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Search Input Box */
        <div className="relative">
          <div className="relative flex items-center">
            <Search
              className={`absolute left-3.5 w-4 h-4 pointer-events-none ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              disabled={disabled}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border transition-all ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent'
              } ${error ? 'border-rose-500' : ''}`}
            />
            {loading ? (
              <Loader2 className={`absolute right-3.5 w-4 h-4 animate-spin ${isDark ? 'text-emerald-400' : 'text-blue-600'}`} />
            ) : (
              <ChevronDown
                className={`absolute right-3.5 w-4 h-4 pointer-events-none transition-transform ${
                  isOpen ? 'rotate-180' : ''
                } ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              />
            )}
          </div>

          {/* Results Dropdown */}
          {isOpen && (
            <div
              className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-xl max-h-80 overflow-y-auto ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white divide-y divide-slate-800'
                  : 'bg-white border-slate-200 text-slate-900 divide-y divide-slate-100'
              }`}
            >
              {/* Query < 2 chars prompt */}
              {query.trim().length < 2 && (
                <div className={`p-4 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Building2 className="w-5 h-5 mx-auto mb-1 opacity-50" />
                  <span>Type at least 2 characters to search across 13,000+ AICTE institutions</span>
                </div>
              )}

              {/* Searching indicator */}
              {loading && results.length === 0 && (
                <div className={`p-4 text-center text-xs flex items-center justify-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching AICTE database...</span>
                </div>
              )}

              {/* Search Results list */}
              {results.length > 0 && (
                <div>
                  <div
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    Found {totalCount} matching institutions
                  </div>
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectCollege(item)}
                      className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50'
                      }`}
                    >
                      <Building2 className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{item.name}</div>
                        <div className={`text-[11px] flex items-center gap-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="font-mono text-[10px] text-blue-500 font-medium">
                            ID: {item.aicte_permanent_id || 'N/A'}
                          </span>
                          {(item.district || item.city || item.state) && (
                            <span className="truncate">
                              • {[item.district || item.city, item.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Load more if has_more */}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loading}
                      className={`w-full py-2 text-center text-xs font-semibold cursor-pointer ${
                        isDark ? 'text-emerald-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-slate-50'
                      }`}
                    >
                      {loading ? 'Loading more...' : `Load more results (${results.length} of ${totalCount})`}
                    </button>
                  )}
                </div>
              )}

              {/* No results found */}
              {query.trim().length >= 2 && !loading && results.length === 0 && (
                <div className="p-4 text-center">
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    No institutions found matching <span className="font-bold">"{query}"</span>.
                  </p>
                  {allowManualEntry && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualName(query.trim());
                        setShowManualForm(true);
                        setIsOpen(false);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add "{query.trim()}" as Custom / Unlisted College
                    </button>
                  )}
                </div>
              )}

              {/* Manual Entry Option footer */}
              {allowManualEntry && query.trim().length >= 2 && results.length > 0 && (
                <div className={`p-2.5 text-center ${isDark ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setManualName(query.trim());
                      setShowManualForm(true);
                      setIsOpen(false);
                    }}
                    className={`text-xs font-medium hover:underline inline-flex items-center gap-1 cursor-pointer ${
                      isDark ? 'text-emerald-400' : 'text-blue-600'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Can't find your college? Click to enter manually
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual College Registration Modal / Drawer */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl p-5 border shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <div className="flex items-center gap-2">
                <Building2 className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-blue-600'}`} />
                <h3 className="text-sm font-bold">Add Unlisted AICTE Institution</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualInstitution} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Full Institution / College Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. National Institute of Technology & Management"
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">AICTE ID (Optional)</label>
                  <input
                    type="text"
                    value={manualAicteId}
                    onChange={(e) => setManualAicteId(e.target.value)}
                    placeholder="e.g. 1-987654321"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">District / City</label>
                  <input
                    type="text"
                    value={manualDistrict}
                    onChange={(e) => setManualDistrict(e.target.value)}
                    placeholder="e.g. Pune"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">State</label>
                <input
                  type="text"
                  value={manualState}
                  onChange={(e) => setManualState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className={`px-3 py-1.5 rounded-lg font-medium ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting || !manualName.trim()}
                  className="px-4 py-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {manualSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Select College</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-500 mt-1">{error}</p>}
    </div>
  );
};
