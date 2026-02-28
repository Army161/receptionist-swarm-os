const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string, orgName: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, orgName }) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Orgs
  getOrg: () => request('/orgs/current'),

  // Locations
  getLocations: () => request('/locations'),
  createLocation: (data: { name: string; address?: string; timezone?: string }) =>
    request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  getLocation: (id: string) => request(`/locations/${id}`),

  // Agent Packs
  getAgentPacks: (locationId: string) => request(`/agent-packs/list?location_id=${locationId}`),
  getCurrentAgentPack: (locationId: string) => request(`/agent-packs/current?location_id=${locationId}`),
  getAgentPack: (id: string) => request(`/agent-packs/${id}`),
  rollbackAgentPack: (locationId: string, targetVersion: number) =>
    request('/agent-packs/rollback', { method: 'POST', body: JSON.stringify({ locationId, targetVersion }) }),

  // Onboarding
  startOnboarding: (locationId: string, websiteUrl: string) =>
    request('/onboarding/start', { method: 'POST', body: JSON.stringify({ locationId, websiteUrl }) }),
  confirmOnboarding: (data: {
    agentPackId: string;
    topCallGoals?: string[];
    afterHoursBehavior?: string;
    pricingDisclosure?: string;
    transferTargets?: { name: string; number: string; department?: string }[];
    complianceDisclosures?: string[];
  }) => request('/onboarding/confirm', { method: 'POST', body: JSON.stringify(data) }),
  deployOnboarding: (agentPackId: string, locationId: string, phoneNumber?: string) =>
    request('/onboarding/deploy', { method: 'POST', body: JSON.stringify({ agentPackId, locationId, phoneNumber }) }),

  // Calls
  getCalls: (params: { locationId?: string; from?: string; to?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params.locationId) qs.set('location_id', params.locationId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return request(`/calls?${qs.toString()}`);
  },
  getCall: (id: string) => request(`/calls/${id}`),
  getCallTranscript: (id: string) => request(`/calls/${id}/transcript`),

  // Analytics
  getAnalytics: (params: { locationId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params.locationId) qs.set('location_id', params.locationId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return request(`/analytics/calls?${qs.toString()}`);
  },
};
