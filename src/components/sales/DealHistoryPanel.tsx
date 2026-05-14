'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DealVersion {
  id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  changed_fields: Record<string, { from: unknown; to: unknown }> | null;
  status_from: string | null;
  status_to: string | null;
  note: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  optie: 'Optie',
  offerte_verstuurd: 'Offerte verstuurd',
  bevestigd: 'Bevestigd',
  afgerond: 'Afgerond',
  betaald: 'Betaald',
  geannuleerd: 'Geannuleerd',
};

const STATUS_COLORS: Record<string, string> = {
  optie: 'bg-yellow-100 text-yellow-800',
  offerte_verstuurd: 'bg-orange-100 text-orange-800',
  bevestigd: 'bg-green-100 text-green-800',
  afgerond: 'bg-blue-100 text-blue-800',
  betaald: 'bg-emerald-100 text-emerald-800',
  geannuleerd: 'bg-red-100 text-red-800',
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Naam',
  estimated_value: 'Waarde',
  num_persons: 'Personen',
  event_date: 'Eventdatum',
  location: 'Locatie',
  probability: 'Kans',
  notes: 'Notities',
};

export function DealHistoryPanel({ dealId }: { dealId: string }) {
  const [versions, setVersions] = useState<DealVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sales/deals/${dealId}/versions`)
      .then(r => r.json())
      .then(d => {
        setVersions(d.versions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dealId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400">
        <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">Nog geen versiegeschiedenis</p>
        <p className="text-xs mt-1 text-stone-300">Elke wijziging wordt automatisch opgeslagen</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <div
          key={version.id}
          className="border border-stone-200 rounded-lg overflow-hidden bg-white"
        >
          {/* Header */}
          <button
            onClick={() => setExpanded(expanded === version.id ? null : version.id)}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 transition-colors"
          >
            {/* Versienummer */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-green-800">v{version.version_number}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status wijziging */}
                {version.status_from && version.status_to && (
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[version.status_from] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[version.status_from] || version.status_from}
                    </span>
                    <svg className="w-3 h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[version.status_to] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[version.status_to] || version.status_to}
                    </span>
                  </div>
                )}
                {/* Gewijzigde velden */}
                {!version.status_from && version.changed_fields && (
                  <span className="text-xs text-stone-500">
                    {Object.keys(version.changed_fields)
                      .map(f => FIELD_LABELS[f] || f)
                      .join(', ')} gewijzigd
                  </span>
                )}
                {version.note && (
                  <span className="text-xs text-stone-400 italic truncate max-w-[160px]">"{version.note}"</span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {format(new Date(version.created_at), 'd MMM yyyy · HH:mm', { locale: nl })}
              </p>
            </div>

            {/* Expand icon */}
            <svg
              className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${expanded === version.id ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded: detail van wijzigingen */}
          {expanded === version.id && (
            <div className="border-t border-stone-100 bg-stone-50 p-3 space-y-2">
              {version.changed_fields && Object.entries(version.changed_fields).map(([field, change]) => (
                <div key={field} className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-stone-600 w-24 flex-shrink-0">
                    {FIELD_LABELS[field] || field}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="line-through text-red-400">
                      {String(change.from || '—')}
                    </span>
                    <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-green-700 font-medium">
                      {String(change.to || '—')}
                    </span>
                  </div>
                </div>
              ))}

              {/* Snapshot snapshot van deal op dat moment */}
              <details className="mt-2">
                <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">
                  Volledige dealstatus op dit moment
                </summary>
                <div className="mt-2 space-y-1">
                  {['title', 'estimated_value', 'num_persons', 'event_date', 'location', 'probability'].map(field => (
                    version.snapshot[field] !== undefined && (
                      <div key={field} className="flex gap-2 text-xs">
                        <span className="text-stone-400 w-24">{FIELD_LABELS[field] || field}</span>
                        <span className="text-stone-600">{String(version.snapshot[field])}</span>
                      </div>
                    )
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
