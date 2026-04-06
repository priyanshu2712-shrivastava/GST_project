"use client";

import { useEffect, useState } from "react";
import { listBills, getMonthlySummary, getHealth } from "@/lib/api";
import type { Bill, MonthlySummary, HealthResponse } from "@/lib/api";
import { KPICard, StatusBadge } from "@/components/UIComponents";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getCompanyInfo } from "@/lib/auth";

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
                    <div className="h-12 w-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-20 text-center">
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8">
                    <p className="text-4xl mb-4">⚠️</p>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Backend Not Available</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <code className="inline-block bg-gray-800 px-4 py-2 rounded-lg text-sm text-gray-300">
                        cd backend && uvicorn app.main:app --reload --port 8000
                    </code>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Dashboard
                </h1>
                <p className="text-gray-500 mt-1">
                    {companyInfo?.company_name ?? "Your Company"} — GST Bill Overview
                </p>
            </div>

            {/* System Status */}
            {health && (
                <div className="mb-6 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                        <span className="text-gray-400">Backend Connected</span>
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className={health.ai_available ? "text-emerald-400" : "text-yellow-400"}>
                        AI: {health.ai_available ? "✅ Active" : "⚠️ No API Key"}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">
                        Business: <span className="text-gray-300">{companyInfo?.business_type ?? health.business_type}</span>
                    </span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPICard title="Total Bills" value={summary?.total_bills ?? bills.length} subtitle="This month" icon="📄" gradient="from-indigo-400 to-violet-400" />
                <KPICard title="Total GST" value={summary ? `₹${summary.total_gst.toLocaleString("en-IN")}` : "₹0"} subtitle="CGST + SGST + IGST" icon="💰" gradient="from-emerald-400 to-teal-400" />
                <KPICard title="ITC Eligible" value={summary ? `₹${summary.itc_eligible_amount.toLocaleString("en-IN")}` : "₹0"} subtitle="Claimable credit" icon="✅" gradient="from-green-400 to-emerald-400" />
                <KPICard title="Needs Review" value={summary?.bills_needing_review ?? 0} subtitle="Manual review required" icon="⚠️" gradient="from-orange-400 to-amber-400" />
            </div>

            {/* Recent Bills */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <h2 className="text-lg font-semibold">Recent Bills</h2>
                    <Link href="/bills" className="text-sm text-indigo-400 hover:text-indigo-300">
                        View All →
                    </Link>
                </div>

                {bills.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-400">No bills uploaded yet</p>
                        <Link href="/upload" className="inline-block mt-3 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors">
                            Upload Your First Bill
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="px-5 py-3">File</th>
                                    <th className="px-5 py-3">Vendor</th>
                                    <th className="px-5 py-3">Category</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {bills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-5 py-3">
                                            <Link href={`/bills/${bill.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                                                {bill.file_name}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 text-gray-300">{bill.vendor_name || "—"}</td>
                                        <td className="px-5 py-3 text-gray-300">{bill.final_category || bill.ai_category || "—"}</td>
                                        <td className="px-5 py-3 text-gray-300">
                                            {bill.total_amount ? `₹${bill.total_amount.toLocaleString("en-IN")}` : "—"}
                                        </td>
                                        <td className="px-5 py-3"><StatusBadge status={bill.status} /></td>
                                        <td className="px-5 py-3 text-gray-500 text-xs">
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
