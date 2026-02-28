'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { BarChart3, Phone, CalendarCheck, UserPlus, ArrowRightLeft, Clock, TrendingDown } from 'lucide-react';

interface Location {
  id: string;
  name: string;
}

interface KPIs {
  totalCalls: number;
  bookingRate: number;
  leadCaptureRate: number;
  transferRate: number;
  abandonRate: number;
  avgDurationSeconds: number;
  outcomeBreakdown: Record<string, number>;
  callsByDay: { date: string; count: number }[];
  topToolsCalled: { tool: string; count: number }[];
}

export default function AnalyticsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLocations().then(setLocations).catch(console.error);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedLocation, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalytics({
        locationId: selectedLocation || undefined,
        from: dateRange.from || undefined,
        to: dateRange.to || undefined,
      });
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
        { label: 'Lead Capture Rate', value: `${kpis.leadCaptureRate}%`, icon: UserPlus, color: 'text-purple-600 bg-purple-50' },
        { label: 'Transfer Rate', value: `${kpis.transferRate}%`, icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50' },
        { label: 'Abandon Rate', value: `${kpis.abandonRate}%`, icon: TrendingDown, color: 'text-red-600 bg-red-50' },
        { label: 'Avg Duration', value: `${kpis.avgDurationSeconds}s`, icon: Clock, color: 'text-gray-600 bg-gray-100' },
      ]
    : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-brand-600" />
            Analytics
          </h1>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
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
        </div>

        {loading ? (
          <div className="text-gray-500 animate-pulse">Loading analytics...</div>
        ) : kpis ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className={`p-2 rounded-lg ${card.color} w-fit mb-2`}>
                      <Icon size={18} />
                    </div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Outcome Breakdown */}
            {kpis.outcomeBreakdown && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4">Outcome Breakdown</h2>
                <div className="space-y-3">
                  {Object.entries(kpis.outcomeBreakdown).map(([outcome, count]) => {
                    const maxCount = Math.max(...Object.values(kpis.outcomeBreakdown));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={outcome} className="flex items-center gap-3">
                        <span className="text-sm w-32 capitalize text-gray-600">{outcome.replace('_', ' ')}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calls by Day */}
            {kpis.callsByDay.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4">Calls by Day</h2>
                <div className="flex items-end gap-1 h-40">
                  {kpis.callsByDay.map((day) => {
                    const maxCount = Math.max(...kpis.callsByDay.map((d) => d.count));
                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium">{day.count}</span>
                        <div
                          className="w-full bg-brand-500 rounded-t transition-all"
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

            {/* Top Tools */}
            {kpis.topToolsCalled && kpis.topToolsCalled.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-4">Top Tools Called</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {kpis.topToolsCalled.map((t) => (
                    <div key={t.tool} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl font-bold">{t.count}</p>
                      <p className="text-xs text-gray-500 font-mono">{t.tool}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">No analytics data available.</p>
        )}
      </div>
    </AppShell>
  );
}
