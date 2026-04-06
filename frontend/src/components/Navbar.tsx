"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated, clearAuth, getCompanyInfo } from "@/lib/auth";
import { useEffect, useState } from "react";

const authNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/upload", label: "Upload", icon: "📤" },
    { href: "/bills", label: "Bills", icon: "📋" },
    { href: "/export", label: "Export", icon: "📥" },
    { href: "/company", label: "Company", icon: "🏢" },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [authed, setAuthed] = useState(false);
    const [companyName, setCompanyName] = useState<string | null>(null);

    useEffect(() => {
        const auth = isAuthenticated();
        setAuthed(auth);
        if (auth) {
            const info = getCompanyInfo();
            setCompanyName(info?.company_name ?? null);
        }
    }, [pathname]); // re-run when route changes (after login/logout)

    function handleLogout() {
        clearAuth();
        router.push("/");
    }

    return (
        <nav className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href={authed ? "/dashboard" : "/"} className="flex items-center gap-3 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            GST
                        </div>
                        <div>
                            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                                BillDigitizer
                            </span>
                            {companyName && (
                                <span className="hidden sm:inline text-xs text-gray-500 ml-2">
                                    · {companyName}
                                </span>
                            )}
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        {authed ? (
                            <>
                                {authNavItems.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? "bg-indigo-500/10 text-indigo-400 shadow-sm"
                                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                                                }`}
                                        >
                                            <span>{item.icon}</span>
                                            <span className="hidden sm:inline">{item.label}</span>
                                        </Link>
                                    );
                                })}
                                <button
                                    id="logout-btn"
                                    onClick={handleLogout}
                                    className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                >
                                    <span>🚪</span>
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Register Free
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
