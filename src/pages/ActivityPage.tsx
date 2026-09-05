import React, { useState, useEffect } from 'react';
import {
  History,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { IActivityLog } from '../types.js';
import { api } from '../services/api.js';

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<IActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.getActivity({
        eventType: selectedType !== 'All' ? selectedType : undefined,
        severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
        limit: 100,
      });
      if (res.success) setLogs(res.logs);
    } catch (err) {
      console.error('Failed fetching activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedType, selectedSeverity]);

  const filteredLogs = logs.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase())
  );

  const eventTypes = [
    'All',
    'PRODUCT_PICKED',
    'WRONG_BARCODE_SCANNED',
    'PRODUCT_ADDED',
    'LOCATION_ASSIGNED',
    'ORDER_CREATED',
    'ORDER_DISPATCHED',
    'ROW_ACTIVATED',
    'INVENTORY_UPDATED',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
              Audit & Compliance Ledger
            </span>
            <span className="text-xs text-slate-500 font-medium">Recorded Warehouse Events</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Activity & Event Timeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete, immutable audit trail tracking picking verifications, barcode interceptions, and inventory shifts.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh Timeline
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event title or description..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full sm:w-36 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Severities</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {eventTypes.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors shrink-0 text-[11px] ${
                selectedType === t
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center text-slate-500 text-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600 mr-2" />
            Loading activity stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No matching activity records found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log._id} className="py-3 flex items-start gap-3.5 hover:bg-slate-50/60 transition-colors px-1 rounded-md">
                {/* Severity Icon */}
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    log.severity === 'error'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : log.severity === 'warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : log.severity === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {log.severity === 'error' ? (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  ) : log.severity === 'warning' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : log.severity === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Info className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{log.title}</h4>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200">
                      {log.eventType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{log.description}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
