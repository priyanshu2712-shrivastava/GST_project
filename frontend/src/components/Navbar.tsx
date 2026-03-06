"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/upload", label: "Upload", icon: "📤" },
    { href: "/bills", label: "Bills", icon: "📋" },
    { href: "/export", label: "Export", icon: "📥" },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            GST
                        </div>
                        <div>
                            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                                Bill Digitizer
                            </span>
                            <span className="hidden sm:inline text-xs text-gray-500 ml-2">
                                AI-Powered
                            </span>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? "bg-indigo-500/10 text-indigo-400 shadow-sm"
                                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}
