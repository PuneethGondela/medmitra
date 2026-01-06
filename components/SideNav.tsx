// components/SideNav.tsx
"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SideNav({ 
  visitsCount, 
  lastVisited 
}: { 
  visitsCount: number; 
  lastVisited: string | null;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/worker",
      icon: "🏠",
      label: "Overview",
      active: pathname === "/worker",
    },
    {
      href: "/worker/profile",
      icon: "👤",
      label: "Profile",
      active: pathname === "/worker/profile",
    },
  ];

  return (
    <nav className="card h-fit sticky top-6 bg-gradient-to-br from-white via-primary-50/40 to-secondary-50/40 border-2 border-primary-200/50">
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                item.active
                  ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold shadow-medium"
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-primary-100 hover:to-secondary-100 hover:shadow-soft"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}

        <li className="pt-4 mt-4 border-t border-gray-200">
          <div className="px-4 py-2">
            <div className="flex items-center gap-3 text-gray-600">
              <span>📋</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Visits</div>
                <div className="text-xs text-gray-500">{visitsCount} total</div>
              </div>
            </div>
          </div>
        </li>

        {lastVisited && (
          <li className="px-4 py-2">
            <div className="text-xs text-gray-500">
              <div className="font-medium mb-1">Last visit:</div>
              <div>{new Date(lastVisited).toLocaleDateString()}</div>
              <div className="text-gray-400">
                {new Date(lastVisited).toLocaleTimeString()}
              </div>
            </div>
          </li>
        )}
      </ul>
    </nav>
  );
}

