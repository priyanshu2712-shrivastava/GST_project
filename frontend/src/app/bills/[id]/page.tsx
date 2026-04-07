"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBill, processBill } from "@/lib/api";
import type { Bill, RiskFlag } from "@/lib/api";
import { StatusBadge, SeverityBadge } from "@/components/UIComponents";
import Link from "next/link";

export default function BillDetailPage() {
    const params = useParams();
    const billId = Number(params.id);

    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        async function fetchBill() {
            try {
                const data = await getBill(billId);
                setBill(data);
            } catch {
                // Bill not found
            } finally {
                setLoading(false);
            }
        }
        fetchBill();
    }, [billId]);

    const handleProcess = async () => {
        setProcessing(true);
        try {
            const updated = await processBill(billId);
            setBill(updated);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Processing failed. Check the backend logs.";
            alert(msg);
            // Refresh bill to show any updated state (e.g. error/duplicate flags)
            try { setBill(await getBill(billId)); } catch { /* ignore */ }
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-20 text-center">
                <p className="text-4xl mb-4">🔍</p>
                <h2 className="text-xl font-bold text-gray-300 mb-2">Bill Not Found</h2>
                <Link href="/bills" className="text-indigo-400 hover:text-indigo-300">
                    ← Back to Bills
                </Link>
            </div>
        );
    }

    const riskFlags: RiskFlag[] = bill.risk_flags ? JSON.parse(bill.risk_flags) : [];
    const duplicateFlag = riskFlags.find((f) => f.flag_type === "duplicate_invoice");

    return (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/bills" className="text-sm text-gray-500 hover:text-gray-300 mb-2 block">
                        ← Back to Bills
                    </Link>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        {bill.file_name}
                        <StatusBadge status={bill.status} />
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Bill #{bill.id}</p>
                </div>
                {/* ALWAYS show the process button so we can retry failures */}
                <button
                    onClick={handleProcess}
                    disabled={processing}
                    className="px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {processing ? (
                        <>
                            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Processing...
                        </>
                    ) : (
                        bill.status === "pending" ? "🔄 Process Bill" : "🔄 Reprocess Bill"
                    )}
                </button>
            </div>

            {/* ── DUPLICATE ENTRY BANNER ─────────────────────────────── */}
            {duplicateFlag && (
                <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-5">
                    <div className="flex items-start gap-4">
                        <div className="text-3xl select-none">🔴</div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-red-400 mb-1 flex items-center gap-2">
                                ⚠️ DUPLICATE ENTRY — Not Counted in Reports
                            </h2>
                            <p className="text-sm text-red-300 mb-2">{duplicateFlag.message}</p>
                            <p className="text-xs text-red-400/80">
                                💡 {duplicateFlag.recommendation}
                            </p>
                            {"existing_bill_id" in duplicateFlag && (
                                <Link
                                    href={`/bills/${(duplicateFlag as RiskFlag & { existing_bill_id: number }).existing_bill_id}`}
                                    className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors border border-red-500/30"
                                >
                                    View Original Bill →
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                        <p className="text-xs text-gray-500">
                            All extracted data shown below is for reference only.
                            This bill has been excluded from monthly summaries and exports.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Vendor & Invoice Info */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Invoice Details
                        </h2>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Vendor</dt>
                                <dd className="text-gray-200">{bill.vendor_name || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">GSTIN</dt>
                                <dd className="text-gray-200 font-mono text-xs">{bill.vendor_gstin || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Invoice No.</dt>
                                <dd className="text-gray-200">{bill.invoice_number || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Date</dt>
                                <dd className="text-gray-200">
                                    {bill.invoice_date
                                        ? new Date(bill.invoice_date).toLocaleDateString("en-IN")
                                        : "—"}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                            Financial Breakdown
                        </h2>
                        <dl className="space-y-3 text-sm">
                            {/* Subtotal */}
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Subtotal</dt>
                                <dd className="text-gray-200">₹{(bill.subtotal || 0).toLocaleString("en-IN")}</dd>
                            </div>

                            {/* Discount — always visible */}
                            <div className="flex justify-between">
                                <dt className={bill.discount > 0 ? "text-orange-400" : "text-gray-600"}>
                                    Discount
                                </dt>
                                <dd className={bill.discount > 0 ? "text-orange-400" : "text-gray-600"}>
                                    {bill.discount > 0
                                        ? `− ₹${bill.discount.toLocaleString("en-IN")}`
                                        : "₹0"}
                                </dd>
                            </div>

                            {/* Net Taxable Amount — always visible, = Subtotal − Discount */}
                            <div className="flex justify-between border-t border-gray-800/60 pt-2">
                                <dt className="text-gray-400 font-medium">Net Taxable Amount</dt>
                                <dd className="text-gray-100 font-semibold">
                                    ₹{
                                        (
                                            bill.net_taxable_amount != null && bill.net_taxable_amount !== 0
                                                ? bill.net_taxable_amount
                                                : (bill.subtotal || 0) - (bill.discount || 0)
                                        ).toLocaleString("en-IN")
                                    }
                                </dd>
                            </div>

                            <div className="flex justify-between">
                                <dt className="text-gray-500">CGST</dt>
                                <dd className="text-gray-200">₹{(bill.cgst || 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">SGST</dt>
                                <dd className="text-gray-200">₹{(bill.sgst || 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">IGST</dt>
                                <dd className="text-gray-200">₹{(bill.igst || 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div className="flex justify-between border-t border-gray-800 pt-3">
                                <dt className="text-gray-300 font-semibold">Total</dt>
                                <dd className="text-white font-bold text-lg">
                                    ₹{(bill.total_amount || 0).toLocaleString("en-IN")}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* OCR Text */}
                    {bill.raw_ocr_text && (
                        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                OCR Extracted Text
                            </h2>
                            <pre className="text-xs text-gray-400 bg-gray-950 rounded-lg p-4 overflow-x-auto max-h-64 whitespace-pre-wrap">
                                {bill.raw_ocr_text}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* AI Classification */}
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                        <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            🤖 AI Classification
                        </h2>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Category</dt>
                                <dd className="text-indigo-300 font-medium">{bill.ai_category || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Sub-category</dt>
                                <dd className="text-gray-300">{bill.ai_sub_category || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Confidence</dt>
                                <dd className={`font-medium ${(bill.ai_confidence || 0) >= 0.7
                                        ? "text-emerald-400"
                                        : (bill.ai_confidence || 0) >= 0.4
                                            ? "text-yellow-400"
                                            : "text-red-400"
                                    }`}>
                                    {bill.ai_confidence != null
                                        ? `${(bill.ai_confidence * 100).toFixed(0)}%`
                                        : "—"}
                                </dd>
                            </div>
                            {bill.ai_reasoning && (
                                <div>
                                    <dt className="text-gray-500 mb-1">Reasoning</dt>
                                    <dd className="text-gray-300 text-xs bg-gray-900/50 rounded-lg p-3">
                                        {bill.ai_reasoning}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Rule Engine Decisions */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                        <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            ⚖️ Rule Engine Decisions (Final)
                        </h2>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Final Category</dt>
                                <dd className="text-emerald-300 font-medium">{bill.final_category || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">GST Applicable</dt>
                                <dd>{bill.gst_applicable ? "✅ Yes" : "❌ No"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">GST Rate</dt>
                                <dd className="text-gray-200 font-medium">{bill.gst_rate ?? "—"}%</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">HSN Code</dt>
                                <dd className="text-gray-200 font-mono">{bill.hsn_code || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">ITC Eligible</dt>
                                <dd className={bill.itc_eligible ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                                    {bill.itc_eligible ? "✅ Claimable" : "❌ Blocked"}
                                </dd>
                            </div>
                            {bill.itc_blocked_reason && (
                                <div>
                                    <dt className="text-gray-500 mb-1">Block Reason</dt>
                                    <dd className="text-red-300 text-xs bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                                        {bill.itc_blocked_reason}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Risk Flags */}
                    {riskFlags.length > 0 && (
                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
                            <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-4">
                                ⚠️ Risk Flags ({riskFlags.length})
                            </h2>
                            <div className="space-y-3">
                                {riskFlags.map((flag, i) => (
                                    <div key={i} className="bg-gray-900/50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <SeverityBadge severity={flag.severity} />
                                            <span className="text-sm text-gray-300">{flag.message}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-1">
                                            💡 {flag.recommendation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audit Trail */}
                    {bill.audit_logs.length > 0 && (
                        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                📝 Audit Trail
                            </h2>
                            <div className="space-y-3">
                                {bill.audit_logs.map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 text-xs">
                                        <span className="text-gray-600 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleTimeString("en-IN")}
                                        </span>
                                        <div>
                                            <span className="text-gray-300 font-medium">
                                                {log.action.replace(/_/g, " ")}
                                            </span>
                                            <span className="text-gray-600 ml-1">by {log.performed_by}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
