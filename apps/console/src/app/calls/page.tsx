'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Phone, ChevronRight, Clock, User } from 'lucide-react';

interface Location {
  id: string;
  name: string;
}

interface Call {
  id: string;
  locationId: string;
  providerCallId: string;
  callerNumber: string;
  outcome: string;
  startedAt: string;
  endedAt: string | null;
  metricsJson: any;
  createdAt: string;
}

interface Transcript {
  id: string;
  callId: string;
  transcriptText: string;
  structuredJson: any;
}

const outcomeColors: Record<string, string> = {
  booked: 'bg-green-100 text-green-700',
  lead_captured: 'bg-purple-100 text-purple-700',
  faq_answered: 'bg-blue-100 text-blue-700',
  transferred: 'bg-orange-100 text-orange-700',
  abandoned: 'bg-red-100 text-red-700',
  queued_callback: 'bg-yellow-100 text-yellow-700',
};

export default function CallsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    api.getLocations().then(setLocations).catch(console.error);
  }, []);

  useEffect(() => {
    loadCalls();
  }, [selectedLocation, page]);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const data = await api.getCalls({
        locationId: selectedLocation || undefined,
        limit,
        offset: page * limit,
      });
      setCalls(data.calls || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load calls', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTranscript = async (callId: string) => {
    try {
      const data = await api.getCallTranscript(callId);
      setTranscript(data);
    } catch {
      setTranscript(null);
    }
  };

  const selectCall = (call: Call) => {
    setSelectedCall(call);
    loadTranscript(call.id);
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const seconds = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Call Logs</h1>
          <div className="flex items-center gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setPage(0); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">{total} calls</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call List */}
          <div className="lg:col-span-1 space-y-2">
            {loading ? (
              <div className="text-gray-500 animate-pulse">Loading...</div>
            ) : calls.length === 0 ? (
              <p className="text-sm text-gray-500">No calls found.</p>
            ) : (
              <>
                {calls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => selectCall(call)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedCall?.id === call.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-100 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">{call.callerNumber || 'Unknown'}</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        outcomeColors[call.outcome] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {call.outcome?.replace('_', ' ') || 'unknown'}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDuration(call.startedAt, call.endedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(call.startedAt || call.createdAt).toLocaleString()}
                    </p>
                  </button>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="text-sm text-brand-600 disabled:text-gray-400"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {page + 1} of {Math.ceil(total / limit) || 1}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * limit >= total}
                    className="text-sm text-brand-600 disabled:text-gray-400"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Call Detail */}
          <div className="lg:col-span-2">
            {selectedCall ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="text-brand-600" size={24} />
                  <div>
                    <h2 className="text-lg font-semibold">{selectedCall.callerNumber || 'Unknown Caller'}</h2>
                    <p className="text-xs text-gray-400">{selectedCall.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Outcome:</span>{' '}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      outcomeColors[selectedCall.outcome] || 'bg-gray-100'
                    }`}>
                      {selectedCall.outcome?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>{' '}
                    <span className="font-medium">{formatDuration(selectedCall.startedAt, selectedCall.endedAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Started:</span>{' '}
                    <span className="font-medium">{new Date(selectedCall.startedAt || selectedCall.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Provider ID:</span>{' '}
                    <span className="font-mono text-xs">{selectedCall.providerCallId}</span>
                  </div>
                </div>

                {selectedCall.metricsJson && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Metrics</h3>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedCall.metricsJson, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Transcript</h3>
                  {transcript ? (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                      {transcript.transcriptText}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No transcript available</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center text-gray-400">
                Select a call to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
