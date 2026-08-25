"use client";

import { useState } from "react";
import {
    Building2,
    CircleCheck,
    Download,
    FileSpreadsheet,
    FileText,
    ReceiptText,
    TriangleAlert,
    Wallet,
} from "lucide-react";
import { getExcelBlob, getTallyXmlBlob, getMonthlySummary } from "@/lib/api";
import type { MonthlySummary } from "@/lib/api";
import { T, Spinner, PageHeader, KPICard } from "@/components/UIComponents";
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
        <div className={T.pageNarrow}>
            <PageHeader
                title="Export Reports"
                subtitle="Generate monthly Excel and Tally XML exports"
            />

            {/* Month/Year Selector */}
            <section className={`${T.card} mb-6`}>
                <div className={T.cardHeader}>
                    <h2 className={T.h2}>Select Period</h2>
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
                    <div className="sm:w-48">
                        <label className={T.label}>Month</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className={T.input}
                        >
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i + 1}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:w-32">
                        <label className={T.label}>Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className={`${T.input} tabular`}
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
                        className={T.btnPrimary}
                    >
                        {loading && <Spinner className="h-4 w-4" />}
                        {loading ? "Loading..." : "Load Summary"}
                    </button>
                </div>
            </section>

            {error && (
                <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    <TriangleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{error}</span>
                </div>
            )}

            {/* Summary */}
            {summary && (
                <>
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KPICard
                            title="Total Bills"
                            value={summary.total_bills}
                            Icon={FileText}
                        />
                        <KPICard
                            title="Total Amount"
                            value={`₹${summary.total_amount.toLocaleString("en-IN")}`}
                            Icon={Wallet}
                        />
                        <KPICard
                            title="Total GST"
                            value={`₹${summary.total_gst.toLocaleString("en-IN")}`}
                            Icon={ReceiptText}
                        />
                        <KPICard
                            title="ITC Claimable"
                            value={`₹${summary.itc_eligible_amount.toLocaleString("en-IN")}`}
                            Icon={CircleCheck}
                            tone="positive"
                        />
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(summary.category_breakdown).length > 0 && (
                        <section className={`${T.card} mb-6`}>
                            <div className={T.cardHeader}>
                                <h2 className={T.h2}>Category Breakdown</h2>
                            </div>
                            <div className="space-y-3.5 p-5">
                                {Object.entries(summary.category_breakdown)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([cat, amount]) => {
                                        const pct = (amount / summary.total_amount) * 100;
                                        return (
                                            <div key={cat} className="flex items-center gap-4">
                                                <span className="w-36 shrink-0 truncate text-sm text-[#0a0a0a]">{cat}</span>
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ececec]">
                                                    <div
                                                        className="h-full rounded-full bg-[#0a0a0a]"
                                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                                    />
                                                </div>
                                                <span className="tabular w-28 shrink-0 text-right text-sm text-[#555]">
                                                    ₹{amount.toLocaleString("en-IN")}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </section>
                    )}

                    {/* Download Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => downloadFile("excel")}
                            disabled={downloading === "excel"}
                            className="group flex w-full items-center gap-4 rounded-xl border border-[#e0e0e0] bg-white p-5 text-left transition-colors hover:border-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f5f0eb]">
                                {downloading === "excel" ? (
                                    <Spinner className="h-4 w-4" />
                                ) : (
                                    <FileSpreadsheet className="h-5 w-5 text-[#0a0a0a]" strokeWidth={1.75} />
                                )}
                            </span>
                            <div className="min-w-0">
                                <p className="font-display text-sm font-semibold tracking-tight text-[#0a0a0a]">
                                    {downloading === "excel" ? "Downloading..." : "Download Excel"}
                                </p>
                                <p className="mt-1 text-xs text-[#888]">
                                    3 sheets: Bill Details, GST Summary, ITC Summary
                                </p>
                            </div>
                            <Download
                                className="ml-auto h-4 w-4 shrink-0 text-[#888] transition-colors group-hover:text-[#0a0a0a]"
                                strokeWidth={1.75}
                            />
                        </button>

                        <button
                            onClick={() => downloadFile("tally")}
                            disabled={downloading === "tally"}
                            className="group flex w-full items-center gap-4 rounded-xl border border-[#e0e0e0] bg-white p-5 text-left transition-colors hover:border-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f5f0eb]">
                                {downloading === "tally" ? (
                                    <Spinner className="h-4 w-4" />
                                ) : (
                                    <Building2 className="h-5 w-5 text-[#0a0a0a]" strokeWidth={1.75} />
                                )}
                            </span>
                            <div className="min-w-0">
                                <p className="font-display text-sm font-semibold tracking-tight text-[#0a0a0a]">
                                    {downloading === "tally" ? "Downloading..." : "Download Tally XML"}
                                </p>
                                <p className="mt-1 text-xs text-[#888]">
                                    Purchase voucher entries for Tally import
                                </p>
                            </div>
                            <Download
                                className="ml-auto h-4 w-4 shrink-0 text-[#888] transition-colors group-hover:text-[#0a0a0a]"
                                strokeWidth={1.75}
                            />
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
