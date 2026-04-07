"use client";

import { useEffect, useState } from "react";
import { listBills } from "@/lib/api";
import type { Bill } from "@/lib/api";
import { StatusBadge } from "@/components/UIComponents";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

function BillsContent() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);

    const perPage = 15;

    useEffect(() => {
        async function fetchBills() {
            setLoading(true);
            try {
                const res = await listBills({
                    page,
                    per_page: perPage,
                    status: statusFilter || undefined,
                });
                setBills(res.bills);
                setTotal(res.total);
            } catch {
                // Backend not available
            } finally {
                setLoading(false);
            }
        }
        fetchBills();
    }, [page, statusFilter]);

    const totalPages = Math.ceil(total / perPage);

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Bills
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {total} total bills
                    </p>
                </div>
                <Link
                    href="/upload"
                    className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
                >
                    + Upload New
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-gray-400">Filter:</span>
                {["", "pending", "processed", "review_needed", "error"].map((s) => (
                    <button
                        key={s}
                        onClick={() => {
                            setStatusFilter(s);
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "bg-gray-800 text-gray-400 hover:text-gray-300"
                            }`}
                    >
                        {s === "" ? "All" : s.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="h-8 w-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mx-auto" />
                    </div>
                ) : bills.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No bills found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                                    <th className="px-5 py-3">ID</th>
                                    <th className="px-5 py-3">File</th>
                                    <th className="px-5 py-3">Vendor</th>
                                    <th className="px-5 py-3">Category</th>
                                    <th className="px-5 py-3">GST Rate</th>
                                    <th className="px-5 py-3">ITC</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Confidence</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {bills.map((bill) => {
                                    const flags: { flag_type: string }[] = bill.risk_flags
                                        ? JSON.parse(bill.risk_flags)
                                        : [];
                                    const isDuplicate = flags.some((f) => f.flag_type === "duplicate_invoice");
                                    return (
                                    <tr key={bill.id} className={`hover:bg-gray-800/30 transition-colors ${isDuplicate ? "bg-red-500/5" : ""}`}>
                                        <td className="px-5 py-3 text-gray-500">#{bill.id}</td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/bills/${bill.id}`}
                                                className="text-indigo-400 hover:text-indigo-300 font-medium"
                                            >
                                                {bill.file_name}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3 text-gray-300">
                                            {bill.vendor_name || "—"}
                                        </td>
                                        <td className="px-5 py-3 text-gray-300">
                                            <span className="px-2 py-0.5 rounded bg-gray-800 text-xs">
                                                {bill.final_category || bill.ai_category || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-300">
                                            {bill.gst_rate != null ? `${bill.gst_rate}%` : "—"}
                                        </td>
                                        <td className="px-5 py-3">
                                            {bill.itc_eligible == null ? (
                                                <span className="text-gray-500">—</span>
                                            ) : bill.itc_eligible ? (
                                                <span className="text-emerald-400 text-xs font-medium">✅ Yes</span>
                                            ) : (
                                                <span className="text-red-400 text-xs font-medium">❌ No</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-gray-300 font-medium">
                                            {bill.total_amount ? `₹${bill.total_amount.toLocaleString("en-IN")}` : "—"}
                                        </td>
                                        <td className="px-5 py-3">
                                            {bill.ai_confidence != null ? (
                                                <span
                                                    className={`text-xs font-medium ${
                                                        bill.ai_confidence >= 0.7
                                                            ? "text-emerald-400"
                                                            : bill.ai_confidence >= 0.4
                                                                ? "text-yellow-400"
                                                                : "text-red-400"
                                                    }`}
                                                >
                                                    {(bill.ai_confidence * 100).toFixed(0)}%
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <StatusBadge status={bill.status} />
                                                {isDuplicate && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                                        ⛔ Duplicate
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 text-xs">
                                            {new Date(bill.created_at).toLocaleDateString("en-IN")}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
                        >
                            ← Prev
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BillsPage() {
    return (
        <ProtectedRoute>
            <BillsContent />
        </ProtectedRoute>
    );
}
