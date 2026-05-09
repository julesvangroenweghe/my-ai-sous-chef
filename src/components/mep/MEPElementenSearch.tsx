'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Copy, Clock } from 'lucide-react';

export interface MEPSearchResult {
  component_id: string;
  component_name: string;
  quantity: string | null;
  unit: string | null;
  preparation: string | null;
  supplier: string | null;
  component_group: string | null;
  dish_title: string;
  category: string;
  event_name: string;
  event_date: string;
}

interface MEPElementenSearchProps {
  /** Pre-fill the search with this query */
  initialQuery?: string;
  /** Called when user clicks "Gebruik" on a result */
  onSelect?: (result: MEPSearchResult) => void;
  /** If true, renders inline (no extra padding) */
  inline?: boolean;
}

export function MEPElementenSearch({
  initialQuery = '',
  onSelect,
  inline = false,
}: MEPElementenSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MEPSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/mep/search-components?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      const json = await res.json();
      setResults(json.results || []);
    } catch (err) {
      console.error('MEP search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  // Group results by component_name (case-insensitive)
  const resultsByComponent = results.reduce<Record<string, MEPSearchResult[]>>((acc, r) => {
    const key = r.component_name.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const content = (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          placeholder="Zoek component… (bv. crudités, flatbread, romesco)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            className="absolute right-2 text-gray-300 hover:text-gray-600 transition-colors"
            onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-400 border-t-transparent" />
        </div>
      )}

      {/* No results */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Geen resultaten gevonden voor &ldquo;{query}&rdquo;
        </div>
      )}

      {/* Results grouped by component name */}
      {!loading && results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          <p className="text-xs text-gray-400 px-1">
            {results.length} resultaten · gegroepeerd op naam
          </p>
          {(Object.entries(resultsByComponent) as [string, MEPSearchResult[]][]).map(([key, items]) => (
            <div key={key} className="rounded-lg border border-gray-100 overflow-hidden">
              {/* Component name header */}
              <div className="px-3 py-2 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                <span className="font-medium text-sm text-gray-800">{items[0].component_name}</span>
                <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{items.length}×</span>
              </div>
              {/* Occurrences */}
              {items.map((r) => (
                <div
                  key={r.component_id}
                  className="px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Quantity + preparation + supplier */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(r.quantity || r.unit) && (
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">
                            {r.quantity}{r.unit ? ` ${r.unit}` : ''}
                          </span>
                        )}
                        {r.preparation && (
                          <span className="text-xs text-gray-500 italic">{r.preparation}</span>
                        )}
                        {r.supplier && (
                          <span className="text-xs text-gray-400">[{r.supplier}]</span>
                        )}
                        {!r.quantity && !r.unit && !r.preparation && !r.supplier && (
                          <span className="text-xs text-gray-300 italic">geen details</span>
                        )}
                      </div>
                      {/* Dish + event */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-gray-300 shrink-0" />
                        <span className="text-xs text-gray-400 truncate">
                          {r.dish_title} · {r.event_name} · {formatDate(r.event_date)}
                        </span>
                      </div>
                    </div>
                    {onSelect && (
                      <button
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded px-2 py-1 transition-colors shrink-0 font-medium"
                        onClick={() => onSelect(r)}
                        title="Gebruik deze data"
                      >
                        <Copy size={10} />
                        Gebruik
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && !loading && (
        <div className="text-center py-8 text-gray-300 text-sm">
          Typ een naam om te zoeken in alle MEP-elementen
        </div>
      )}
    </div>
  );

  if (inline) {
    return <div>{content}</div>;
  }

  return content;
}

// ─── Modal wrapper ──────────────────────────────────────────────────────────

interface MEPElementenSearchModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelect?: (result: MEPSearchResult) => void;
}

export function MEPElementenSearchModal({
  open,
  onClose,
  initialQuery,
  onSelect,
}: MEPElementenSearchModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (result: MEPSearchResult) => {
    if (onSelect) onSelect(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-5 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base flex items-center gap-2 text-gray-800">
            <Search size={16} className="text-amber-500" />
            Zoek in MEP-elementen
          </h3>
          <button
            className="text-gray-400 hover:text-gray-700 transition-colors rounded-lg p-1 hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <MEPElementenSearch
          initialQuery={initialQuery}
          onSelect={handleSelect}
          inline
        />
      </div>
    </div>
  );
}
