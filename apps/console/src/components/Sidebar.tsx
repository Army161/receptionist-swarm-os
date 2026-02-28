'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import { LayoutDashboard, Settings, Phone, BarChart3, Boxes, Wand2, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/onboarding', label: 'Onboarding', icon: Wand2 },
  { href: '/agent-packs', label: 'Agent Packs', icon: Boxes },
  { href: '/calls', label: 'Call Logs', icon: Phone },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Swarm OS</h1>
        <p className="text-xs text-gray-400 mt-1">AI Receptionist Console</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        {user && (
          <p className="text-xs text-gray-400 mb-2 truncate">{user.email}</p>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
