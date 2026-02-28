'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Phone, CalendarCheck, UserPlus, ArrowRightLeft, Clock } from 'lucide-react';

interface KPIs {
  totalCalls: number;
  bookingRate: number;
  leadCaptureRate: number;
  transferRate: number;
  abandonRate: number;
  avgDurationSeconds: number;
  outcomeBreakdown: Record<string, number>;
  callsByDay: { date: string; count: number }[];
}

interface Location {
  id: string;
  name: string;
  address: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadKPIs();
  }, [selectedLocation]);

  const loadLocations = async () => {
    try {
      const locs = await api.getLocations();
      setLocations(locs);
    } catch (err) {
      console.error('Failed to load locations', err);
    }
  };

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics({ locationId: selectedLocation || undefined });
      setKpis(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = kpis
    ? [
        { label: 'Total Calls', value: kpis.totalCalls, icon: Phone, color: 'text-blue-600 bg-blue-50' },
        { label: 'Booking Rate', value: `${kpis.bookingRate}%`, icon: CalendarCheck, color: 'text-green-600 bg-green-50' },
        { label: 'Lead Capture', value: `${kpis.leadCaptureRate}%`, icon: UserPlus, color: 'text-purple-600 bg-purple-50' },
        { label: 'Transfer Rate', value: `${kpis.transferRate}%`, icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50' },
        { label: 'Avg Duration', value: `${kpis.avgDurationSeconds}s`, icon: Clock, color: 'text-gray-600 bg-gray-100' },
      ]
    : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-gray-500 animate-pulse">Loading analytics...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${card.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{card.value}</p>
                        <p className="text-xs text-gray-500">{card.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {kpis && kpis.outcomeBreakdown && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4">Call Outcomes</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(kpis.outcomeBreakdown).map(([outcome, count]) => (
                    <div key={outcome} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs text-gray-500 capitalize">{outcome.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {kpis && kpis.callsByDay.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4">Calls by Day</h2>
                <div className="flex items-end gap-1 h-32">
                  {kpis.callsByDay.map((day) => {
                    const maxCount = Math.max(...kpis.callsByDay.map((d) => d.count));
                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{day.count}</span>
                        <div
                          className="w-full bg-brand-500 rounded-t"
                          style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        />
                        <span className="text-xs text-gray-400 truncate w-full text-center">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-2">Locations</h2>
              {locations.length === 0 ? (
                <p className="text-gray-500 text-sm">No locations yet. Start onboarding to add one.</p>
              ) : (
                <div className="space-y-2">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-xs text-gray-500">{loc.address}</p>
                      </div>
                      <span className="text-xs text-gray-400">{loc.id.slice(0, 8)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
