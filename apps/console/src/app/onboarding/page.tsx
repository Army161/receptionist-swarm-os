'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { Wand2, Globe, MessageSquare, Rocket, CheckCircle } from 'lucide-react';

interface Location {
  id: string;
  name: string;
}

type Step = 'select' | 'scan' | 'questions' | 'deploy' | 'done';

const FIVE_QUESTIONS = [
  {
    key: 'topCallGoals',
    label: 'Top 3 Call Goals',
    description: 'What should the AI receptionist prioritize?',
    type: 'multiselect' as const,
    options: ['Book appointments', 'Capture leads / quotes', 'Answer FAQs', 'Transfer to human'],
  },
  {
    key: 'afterHoursBehavior',
    label: 'After-Hours Behavior',
    description: 'What happens when someone calls outside business hours?',
    type: 'select' as const,
    options: ['Take a message', 'Offer callback', 'Emergency transfer', 'Voicemail only'],
  },
  {
    key: 'pricingDisclosure',
    label: 'Pricing Disclosure',
    description: 'Can the AI quote price ranges to callers?',
    type: 'select' as const,
    options: ['Yes — quote ranges from website/docs', 'No — always say "I\'ll have someone follow up with pricing"', 'Only for specific services'],
  },
  {
    key: 'transferTargets',
    label: 'Transfer Targets',
    description: 'Who should calls be transferred to when needed?',
    type: 'text' as const,
    placeholder: 'e.g. Front Desk: +15125551234, Manager: +15125555678',
  },
  {
    key: 'complianceDisclosures',
    label: 'Compliance & Disclosures',
    description: 'Any required disclosures or compliance notes?',
    type: 'multiselect' as const,
    options: ['Call recording disclosure', 'HIPAA compliance notice', 'Not a substitute for emergency services', 'Results may vary disclaimer'],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('select');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [agentPackId, setAgentPackId] = useState('');
  const [draftConfig, setDraftConfig] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLocations().then(setLocations).catch(console.error);
  }, []);

  const handleScan = async () => {
    setError('');
    setLoading(true);
    try {
      let locationId = selectedLocationId;
      if (!locationId && newLocationName) {
        const loc = await api.createLocation({ name: newLocationName });
        locationId = loc.id;
        setSelectedLocationId(locationId);
      }
      if (!locationId) {
        setError('Please select or create a location');
        setLoading(false);
        return;
      }
      const result = await api.startOnboarding(locationId, websiteUrl);
      setAgentPackId(result.agentPackId);
      setDraftConfig(result.draftConfig);
      setStep('questions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      // Parse transfer targets from text
      let transferTargets: { name: string; number: string }[] = [];
      if (answers.transferTargets) {
        const parts = (answers.transferTargets as string).split(',').map((s: string) => s.trim());
        transferTargets = parts.map((p: string) => {
          const [name, number] = p.split(':').map((s: string) => s.trim());
          return { name: name || 'Default', number: number || p };
        });
      }

      await api.confirmOnboarding({
        agentPackId,
        topCallGoals: answers.topCallGoals || [],
        afterHoursBehavior: answers.afterHoursBehavior || 'Take a message',
        pricingDisclosure: answers.pricingDisclosure || 'No',
        transferTargets,
        complianceDisclosures: answers.complianceDisclosures || [],
      });
      setStep('deploy');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setError('');
    setLoading(true);
    try {
      await api.deployOnboarding(agentPackId, selectedLocationId, phoneNumber || undefined);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiSelect = (key: string, option: string) => {
    const current: string[] = answers[key] || [];
    if (current.includes(option)) {
      setAnswers({ ...answers, [key]: current.filter((o: string) => o !== option) });
    } else {
      setAnswers({ ...answers, [key]: [...current, option] });
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Onboarding Wizard</h1>

        {/* Progress */}
        <div className="flex items-center gap-2 text-sm">
          {(['select', 'scan', 'questions', 'deploy', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-brand-600 text-white' :
                (['select', 'scan', 'questions', 'deploy', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              {i < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
        )}

        {/* Step: Select Location + URL */}
        {step === 'select' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="text-brand-600" size={24} />
              <h2 className="text-lg font-semibold">Select Location & Website</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">— Create new —</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            {!selectedLocationId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Location Name</label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Downtown Office"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://example.com"
                required
              />
            </div>

            <button
              onClick={() => { setStep('scan'); handleScan(); }}
              disabled={loading || (!selectedLocationId && !newLocationName) || !websiteUrl}
              className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Wand2 size={18} />
              {loading ? 'Scanning...' : 'Scan & Generate Agent Pack'}
            </button>
          </div>
        )}

        {/* Step: Scanning (loading state) */}
        {step === 'scan' && loading && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Scanning Website...</h2>
            <p className="text-gray-500 text-sm mt-2">Crawling pages, extracting services, hours, and FAQs...</p>
          </div>
        )}

        {/* Step: 5 Questions */}
        {step === 'questions' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="text-brand-600" size={24} />
              <h2 className="text-lg font-semibold">Confirm Your Preferences</h2>
            </div>

            {draftConfig && (
              <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm">
                Detected industry: <strong className="capitalize">{draftConfig.industry || 'general'}</strong>
                {draftConfig.persona?.name && <> | Agent name: <strong>{draftConfig.persona.name}</strong></>}
              </div>
            )}

            {FIVE_QUESTIONS.map((q) => (
              <div key={q.key}>
                <label className="block text-sm font-semibold text-gray-800 mb-1">{q.label}</label>
                <p className="text-xs text-gray-500 mb-2">{q.description}</p>

                {q.type === 'multiselect' && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const selected = (answers[q.key] || []).includes(opt);
                      return (
                        <button
                          key={opt}
                          onClick={() => handleMultiSelect(q.key, opt)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            selected
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === 'select' && q.options && (
                  <select
                    value={answers[q.key] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select...</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.type === 'text' && (
                  <input
                    type="text"
                    value={answers[q.key] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder={q.placeholder}
                  />
                )}
              </div>
            ))}

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Confirming...' : 'Confirm & Finalize'}
            </button>
          </div>
        )}

        {/* Step: Deploy */}
        {step === 'deploy' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="text-brand-600" size={24} />
              <h2 className="text-lg font-semibold">Deploy Agent</h2>
            </div>

            <p className="text-sm text-gray-600">
              Your Agent Pack is confirmed! Optionally assign a phone number, then deploy.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (optional)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="+15125551234"
              />
              <p className="text-xs text-gray-400 mt-1">Forward your business line to this number, or leave blank for now.</p>
            </div>

            <button
              onClick={handleDeploy}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Rocket size={18} />
              {loading ? 'Deploying...' : 'Deploy Agent'}
            </button>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-semibold text-green-700">Agent Deployed!</h2>
            <p className="text-gray-500 mt-2">Your AI receptionist is now live and ready to handle calls.</p>
            <div className="mt-6 space-x-3">
              <a href="/calls" className="inline-block bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
                View Call Logs
              </a>
              <a href="/agent-packs" className="inline-block border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
                View Agent Packs
              </a>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
