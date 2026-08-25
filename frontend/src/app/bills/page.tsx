"use client";

import { useEffect, useState } from "react";
import { listBills } from "@/lib/api";
import type { Bill } from "@/lib/api";
import { StatusBadge, T, Spinner, EmptyState } from "@/components/UIComponents";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Plus,
    Check,
    X,
    Ban,
    Inbox,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

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
        <div className={T.page}>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className={T.h1}>Bills</h1>
                    <p className={`tabular ${T.sub}`}>{total} total bills</p>
                </div>
                <Link href="/upload" className={T.btnPrimary}>
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    Upload new
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs uppercase tracking-wider text-[#888]">Filter</span>
                {["", "pending", "processed", "review_needed", "error"].map((s) => (
                    <button
                        key={s}
                        onClick={() => {
                            setStatusFilter(s);
                            setPage(1);
                        }}
                        className={`capitalize ${statusFilter === s ? T.chipActive : T.chip}`}
                    >
                        {s === "" ? "All" : s.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className={`overflow-hidden ${T.card}`}>
                {loading ? (
                    <div className="p-16 text-center">
                        <Spinner className="mx-auto h-8 w-8" />
                    </div>
                ) : bills.length === 0 ? (
                    <EmptyState Icon={Inbox} title="No bills found" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={T.theadRow}>
                                    <th className={T.th}>ID</th>
                                    <th className={T.th}>File</th>
                                    <th className={T.th}>Vendor</th>
                                    <th className={T.th}>Category</th>
                                    <th className={T.th}>GST rate</th>
                                    <th className={T.th}>ITC</th>
                                    <th className={T.th}>Amount</th>
                                    <th className={T.th}>Confidence</th>
                                    <th className={T.th}>Status</th>
                                    <th className={T.th}>Date</th>
                                </tr>
                            </thead>
                            <tbody className={T.tbody}>
                                {bills.map((bill) => {
                                    const flags: { flag_type: string }[] = bill.risk_flags
                                        ? JSON.parse(bill.risk_flags)
                                        : [];
                                    const isDuplicate = flags.some((f) => f.flag_type === "duplicate_invoice");
                                    return (
                                        <tr
                                            key={bill.id}
                                            className={isDuplicate ? "bg-red-50/60 transition-colors hover:bg-red-50" : T.tr}
                                        >
                                            <td className="tabular px-5 py-3 text-[#888]">#{bill.id}</td>
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
                                            <td className={`tabular ${T.td}`}>
                                                {bill.gst_rate != null ? `${bill.gst_rate}%` : "—"}
                                            </td>
                                            <td className="px-5 py-3">
                                                {bill.itc_eligible == null ? (
                                                    <span className="text-[#888]">—</span>
                                                ) : bill.itc_eligible ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                                        <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> Yes
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                                                        <X className="h-3.5 w-3.5" strokeWidth={2.25} /> No
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`tabular ${T.tdStrong}`}>
                                                {bill.total_amount ? `₹${bill.total_amount.toLocaleString("en-IN")}` : "—"}
                                            </td>
                                            <td className="px-5 py-3">
                                                {bill.ai_confidence != null ? (
                                                    <span
                                                        className={`tabular text-xs font-medium ${bill.ai_confidence >= 0.7
                                                            ? "text-emerald-700"
                                                            : bill.ai_confidence >= 0.4
                                                                ? "text-amber-700"
                                                                : "text-red-700"
                                                            }`}
                                                    >
                                                        {(bill.ai_confidence * 100).toFixed(0)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[#888]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <StatusBadge status={bill.status} />
                                                    {isDuplicate && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200">
                                                            <Ban className="h-3 w-3" strokeWidth={2} />
                                                            Duplicate
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="tabular px-5 py-3 text-xs text-[#888]">
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
                <div className="mt-5 flex items-center justify-between">
                    <p className="tabular text-sm text-[#888]">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className={T.btnGhost}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                            Prev
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className={T.btnGhost}
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
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
