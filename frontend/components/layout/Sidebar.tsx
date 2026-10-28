'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  UserCheck,
  TrendingUp,
  History,
  Bot,
  Users,
  FileBarChart,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/live', label: 'Live Session', icon: Video, badge: 'Live' },
  { href: '/attendance', label: 'Attendance', icon: UserCheck },
  { href: '/analytics', label: 'Engagement Analytics', icon: TrendingUp },
  { href: '/sessions', label: 'Session History', icon: History },
  { href: '/assistant', label: 'AI Teaching Assistant', icon: Bot },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/privacy', label: 'Privacy & Settings', icon: ShieldAlert },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`border-r border-slate-200 bg-white flex flex-col justify-between transition-all duration-200 ${
        collapsed ? 'w-18' : 'w-64'
      } shrink-0 min-h-[calc(100vh-4rem)]`}
    >
      <div className="p-3">
        {/* Toggle Button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom info banner */}
      {!collapsed && (
        <div className="p-4 m-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
          <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Offline Privacy Mode
          </div>
          <p className="leading-relaxed">
            Zero cloud telemetry. Behavioral proxies are not measures of comprehension.
          </p>
        </div>
      )}
    </aside>
  );
}
