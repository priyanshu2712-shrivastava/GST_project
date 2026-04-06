"use client";

import { useState } from "react";
import { getExcelBlob, getTallyXmlBlob, getMonthlySummary } from "@/lib/api";
import type { MonthlySummary } from "@/lib/api";
import { KPICard } from "@/components/UIComponents";
import ProtectedRoute from "@/components/ProtectedRoute";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function ExportContent() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [summary, setSummary] = useState<MonthlySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState("");

    const fetchSummary = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getMonthlySummary(month, year);
            setSummary(data);
        } catch {
            setError(`No bills found for ${MONTHS[month - 1]} ${year}`);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = async (type: "excel" | "tally") => {
        setDownloading(type);
        try {
            const blob = type === "excel"
                ? await getExcelBlob(month, year)
                : await getTallyXmlBlob(month, year);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = type === "excel"
                ? `GST_Report_${MONTHS[month - 1]}_${year}.xlsx`
                : `Tally_${MONTHS[month - 1]}_${year}.xml`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert("Download failed. No data for this period?");
        } finally {
            setDownloading("");
        }
    };

    return (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Export Reports
                </h1>
                <p className="text-gray-500 mt-1">
                    Generate monthly Excel and Tally XML exports
                </p>
            </div>

            {/* Month/Year Selector */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Select Period
                </h2>
                <div className="flex items-end gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Month</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                        >
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i + 1}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                        >
                            {[2024, 2025, 2026, 2027].map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchSummary}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Load Summary"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 mb-6 text-sm text-yellow-400">
                    ⚠️ {error}
                </div>
            )}

            {/* Summary */}
            {summary && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KPICard
                            title="Total Bills"
                            value={summary.total_bills}
                            icon="📄"
                            gradient="from-indigo-400 to-violet-400"
                        />
                        <KPICard
                            title="Total Amount"
                            value={`₹${summary.total_amount.toLocaleString("en-IN")}`}
                            icon="💰"
                            gradient="from-emerald-400 to-teal-400"
                        />
                        <KPICard
                            title="Total GST"
                            value={`₹${summary.total_gst.toLocaleString("en-IN")}`}
                            icon="🧾"
                            gradient="from-blue-400 to-cyan-400"
                        />
                        <KPICard
                            title="ITC Claimable"
                            value={`₹${summary.itc_eligible_amount.toLocaleString("en-IN")}`}
                            icon="✅"
                            gradient="from-green-400 to-emerald-400"
                        />
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(summary.category_breakdown).length > 0 && (
                        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 mb-6">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                Category Breakdown
                            </h2>
                            <div className="space-y-2">
                                {Object.entries(summary.category_breakdown)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([cat, amount]) => {
                                        const pct = (amount / summary.total_amount) * 100;
                                        return (
                                            <div key={cat} className="flex items-center gap-3">
                                                <span className="w-36 text-sm text-gray-300 truncate">{cat}</span>
                                                <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                                    />
                                                </div>
                                                <span className="w-28 text-right text-sm text-gray-400">
                                                    ₹{amount.toLocaleString("en-IN")}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Download Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => downloadFile("excel")}
                            disabled={downloading === "excel"}
                            className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 hover:bg-emerald-500/10 transition-colors group disabled:opacity-50 text-left w-full"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
                            <div>
                                <p className="text-emerald-400 font-semibold">
                                    {downloading === "excel" ? "Downloading..." : "Download Excel"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    3 sheets: Bill Details, GST Summary, ITC Summary
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={() => downloadFile("tally")}
                            disabled={downloading === "tally"}
                            className="flex items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 hover:bg-blue-500/10 transition-colors group disabled:opacity-50 text-left w-full"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">🏢</span>
                            <div>
                                <p className="text-blue-400 font-semibold">
                                    {downloading === "tally" ? "Downloading..." : "Download Tally XML"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Purchase voucher entries for Tally import
                                </p>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ExportPage() {
    return (
        <ProtectedRoute>
            <ExportContent />
        </ProtectedRoute>
    );
}
