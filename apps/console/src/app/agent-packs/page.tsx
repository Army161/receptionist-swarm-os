'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Boxes, ChevronRight, RotateCcw } from 'lucide-react';

interface Location {
  id: string;
  name: string;
}

interface AgentPack {
  id: string;
  locationId: string;
  version: number;
  status: string;
  isCurrent: boolean;
  configJson: any;
  createdAt: string;
}

export default function AgentPacksPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [packs, setPacks] = useState<AgentPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<AgentPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLocations().then((locs) => {
      setLocations(locs);
      if (locs.length > 0) setSelectedLocation(locs[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedLocation) loadPacks();
  }, [selectedLocation]);

  const loadPacks = async () => {
    setLoading(true);
    try {
      const data = await api.getAgentPacks(selectedLocation);
      setPacks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (!confirm(`Rollback to version ${version}?`)) return;
    try {
      await api.rollbackAgentPack(selectedLocation, version);
      await loadPacks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agent Packs</h1>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pack List */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Versions</h2>
            {loading ? (
              <div className="text-gray-500 animate-pulse">Loading...</div>
            ) : packs.length === 0 ? (
              <p className="text-sm text-gray-500">No agent packs yet. Start onboarding to create one.</p>
            ) : (
              packs.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between ${
                    selectedPack?.id === pack.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-100 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{pack.version}</span>
                      {pack.isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        pack.status === 'deployed' ? 'bg-blue-100 text-blue-700' :
                        pack.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {pack.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(pack.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))
            )}
          </div>

          {/* Pack Detail */}
          <div className="lg:col-span-2">
            {selectedPack ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Boxes className="text-brand-600" size={24} />
                    <h2 className="text-lg font-semibold">Version {selectedPack.version}</h2>
                  </div>
                  {!selectedPack.isCurrent && selectedPack.status === 'deployed' && (
                    <button
                      onClick={() => handleRollback(selectedPack.version)}
                      className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 border border-orange-200 px-3 py-1 rounded-lg"
                    >
                      <RotateCcw size={14} />
                      Rollback to this version
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>{' '}
                    <span className="font-medium capitalize">{selectedPack.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Current:</span>{' '}
                    <span className="font-medium">{selectedPack.isCurrent ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>{' '}
                    <span className="font-medium">{new Date(selectedPack.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {selectedPack.configJson && (
                  <>
                    {selectedPack.configJson.persona && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Persona</h3>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                          <p><span className="text-gray-500">Name:</span> {selectedPack.configJson.persona.name}</p>
                          <p><span className="text-gray-500">Tone:</span> {selectedPack.configJson.persona.tone}</p>
                          <p><span className="text-gray-500">Brand Voice:</span> {selectedPack.configJson.persona.brandVoice}</p>
                        </div>
                      </div>
                    )}

                    {selectedPack.configJson.flows?.states && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                          Flow States ({selectedPack.configJson.flows.states.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedPack.configJson.flows.states.map((state: any) => (
                            <span key={state.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {state.id}: {state.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPack.configJson.tools && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                          Tools ({selectedPack.configJson.tools.length})
                        </h3>
                        <div className="space-y-1">
                          {selectedPack.configJson.tools.map((tool: any) => (
                            <div key={tool.name} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                              <span className="font-mono text-xs">{tool.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                tool.permissionLevel === 'auto' ? 'bg-green-100 text-green-700' :
                                tool.permissionLevel === 'confirm' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {tool.permissionLevel}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">Full Config (JSON)</h3>
                      <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-64">
                        {JSON.stringify(selectedPack.configJson, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center text-gray-400">
                Select a version to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
