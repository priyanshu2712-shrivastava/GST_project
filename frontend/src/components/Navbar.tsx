"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated, clearAuth, getCompanyInfo } from "@/lib/auth";
import { useEffect, useState } from "react";
import {
    LayoutDashboard,
    Upload,
    ReceiptText,
    Download,
    Building2,
    LogOut,
    type LucideIcon,
} from "lucide-react";

const authNavItems: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/upload", label: "Upload", Icon: Upload },
    { href: "/bills", label: "Bills", Icon: ReceiptText },
    { href: "/export", label: "Export", Icon: Download },
    { href: "/company", label: "Company", Icon: Building2 },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const isLanding = pathname === "/";
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
        <nav
            className={`sticky top-0 z-50 bg-[#f5f0eb]/90 backdrop-blur-xl ${isLanding ? "border-b border-transparent" : "border-b border-[#e0e0e0]"
                }`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href={authed ? "/dashboard" : "/"} className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a0a0a] text-[#f5f0eb]">
                            <ReceiptText className="h-[18px] w-[18px]" strokeWidth={2} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-display text-[17px] font-semibold text-[#0a0a0a]">
                                GST Ledger
                            </span>
                            {companyName && (
                                <span className="hidden text-xs text-[#888] sm:inline">· {companyName}</span>
                            )}
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        {authed ? (
                            <>
                                {authNavItems.map(({ href, label, Icon }) => {
                                    const isActive = pathname === href || pathname.startsWith(href + "/");
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                                ? "bg-[#0a0a0a]/[0.06] text-[#0a0a0a]"
                                                : "text-[#555] hover:bg-[#0a0a0a]/[0.04] hover:text-[#0a0a0a]"
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                                            <span className="hidden sm:inline">{label}</span>
                                        </Link>
                                    );
                                })}
                                <button
                                    id="logout-btn"
                                    onClick={handleLogout}
                                    className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#555] transition-colors hover:bg-red-50 hover:text-red-700"
                                >
                                    <LogOut className="h-4 w-4" strokeWidth={1.75} />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="rounded-full px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/5"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/register"
                                    className="rounded-full bg-[#f0ff44] px-4 py-2 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#e7f800]"
                                >
                                    Create account
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
