"use client";

import { useEffect, useState } from "react";
import { listBills, getMonthlySummary, getHealth } from "@/lib/api";
import type { Bill, MonthlySummary, HealthResponse } from "@/lib/api";
import { KPICard, StatusBadge, T, Spinner, EmptyState } from "@/components/UIComponents";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getCompanyInfo } from "@/lib/auth";
import {
    FileText,
    IndianRupee,
    ShieldCheck,
    TriangleAlert,
    Inbox,
    ArrowRight,
} from "lucide-react";

function DashboardContent() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [summary, setSummary] = useState<MonthlySummary | null>(null);
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const companyInfo = getCompanyInfo();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [billsRes, healthRes] = await Promise.all([
                    listBills({ page: 1, per_page: 5 }),
                    getHealth(),
                ]);
                setBills(billsRes.bills);
                setHealth(healthRes);
                try {
                    const summaryRes = await getMonthlySummary(currentMonth, currentYear);
                    setSummary(summaryRes);
                } catch {
                    // No bills this month yet
                }
            } catch {
                setError("Cannot connect to backend. Make sure the Python server is running on port 8000.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [currentMonth, currentYear]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <Spinner className="mx-auto mb-4 h-8 w-8" />
                    <p className="text-sm text-[#555]">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-20">
                <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                    <TriangleAlert className="mx-auto h-6 w-6 text-red-600" strokeWidth={1.75} />
                    <h2 className="font-display mt-4 text-lg font-semibold text-red-700">
                        Backend not available
                    </h2>
                    <p className="mt-2 text-sm text-red-700/80">{error}</p>
                    <code className="tabular mt-5 inline-block rounded-lg border border-red-200 bg-white px-4 py-2 text-xs text-[#555]">
                        cd backend &amp;&amp; uvicorn app.main:app --reload --port 8000
                    </code>
                </div>
            </div>
        );
    }

    return (
        <div className={T.page}>
            {/* Header */}
            <div className="mb-8">
                <h1 className={T.h1}>Dashboard</h1>
                <p className={T.sub}>
                    {companyInfo?.company_name ?? "Your Company"} — GST bill overview
                </p>
            </div>

            {/* System Status */}
            {health && (
                <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[#e0e0e0] py-3 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                        <span className="text-[#555]">Backend connected</span>
                    </span>
                    <span className="text-[#e0e0e0]">|</span>
                    <span className={health.ai_available ? "text-emerald-700" : "text-amber-700"}>
                        AI: {health.ai_available ? "Active" : "No API key"}
                    </span>
                    <span className="text-[#e0e0e0]">|</span>
                    <span className="text-[#555]">
                        Business:{" "}
                        <span className="text-[#0a0a0a]">
                            {companyInfo?.business_type ?? health.business_type}
                        </span>
                    </span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Total bills"
                    value={summary?.total_bills ?? bills.length}
                    subtitle="This month"
                    Icon={FileText}
                />
                <KPICard
                    title="Total GST"
                    value={summary ? `₹${summary.total_gst.toLocaleString("en-IN")}` : "₹0"}
                    subtitle="CGST + SGST + IGST"
                    Icon={IndianRupee}
                />
                <KPICard
                    title="ITC eligible"
                    value={summary ? `₹${summary.itc_eligible_amount.toLocaleString("en-IN")}` : "₹0"}
                    subtitle="Claimable credit"
                    Icon={ShieldCheck}
                    tone="positive"
                />
                <KPICard
                    title="Needs review"
                    value={summary?.bills_needing_review ?? 0}
                    subtitle="Manual review required"
                    Icon={TriangleAlert}
                    tone="warn"
                />
            </div>

            {/* Recent Bills */}
            <div className={T.card}>
                <div className={T.cardHeader}>
                    <h2 className={T.h2}>Recent bills</h2>
                    <Link href="/bills" className={`inline-flex items-center gap-1.5 text-sm ${T.link}`}>
                        View all
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                </div>

                {bills.length === 0 ? (
                    <EmptyState
                        Icon={Inbox}
                        title="No bills uploaded yet"
                        action={
                            <Link href="/upload" className={T.btnPrimary}>
                                Upload your first bill
                                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                            </Link>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={T.theadRow}>
                                    <th className={T.th}>File</th>
                                    <th className={T.th}>Vendor</th>
                                    <th className={T.th}>Category</th>
                                    <th className={T.th}>Amount</th>
                                    <th className={T.th}>Status</th>
                                    <th className={T.th}>Date</th>
                                </tr>
                            </thead>
                            <tbody className={T.tbody}>
                                {bills.map((bill) => (
                                    <tr key={bill.id} className={T.tr}>
                                        <td className="px-5 py-3">
                                            <Link href={`/bills/${bill.id}`} className={T.link}>
                                                {bill.file_name}
                                            </Link>
                                        </td>
                                        <td className={T.td}>{bill.vendor_name || "—"}</td>
                                        <td className="px-5 py-3">
                                            <span className={T.tagPill}>
                                                {bill.final_category || bill.ai_category || "—"}
                                            </span>
                                        </td>
                                        <td className={`tabular ${T.tdStrong}`}>
                                            {bill.total_amount ? `₹${bill.total_amount.toLocaleString("en-IN")}` : "—"}
                                        </td>
                                        <td className="px-5 py-3"><StatusBadge status={bill.status} /></td>
                                        <td className="tabular px-5 py-3 text-xs text-[#888]">
                                            {new Date(bill.created_at).toLocaleDateString("en-IN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <DashboardContent />
        </ProtectedRoute>
    );
}
