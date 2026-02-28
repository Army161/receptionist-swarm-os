'use client';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUser(): { id: string; email: string; orgId: string; role: string } | null {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: { id: string; email: string; orgId: string; role: string }): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function logout(): void {
  clearToken();
  localStorage.removeItem('user');
  window.location.href = '/auth';
}
