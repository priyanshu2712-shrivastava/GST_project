"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBill, processBill } from "@/lib/api";
import type { Bill, RiskFlag } from "@/lib/api";
import {
    T,
    Spinner,
    PageHeader,
    EmptyState,
    StatusBadge,
    SeverityBadge,
} from "@/components/UIComponents";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowRight,
    Bot,
    Check,
    FileSearch,
    History,
    Lightbulb,
    RefreshCw,
    Scale,
    TriangleAlert,
    X,
} from "lucide-react";

/* ── Local class atoms for this page's key/value detail rows ──────────── */
const row = "flex items-center justify-between gap-4 px-5 py-3";
const dt = "text-[11px] uppercase tracking-wider text-[#888]";
const dd = "text-sm text-[#0a0a0a]";
const list = "divide-y divide-[#ececec]";
const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1";

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
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    if (!bill) {
        return (
            <div className={T.pageNarrow}>
                <div className={T.card}>
                    <EmptyState
                        Icon={FileSearch}
                        title="Bill Not Found"
                        action={
                            <Link href="/bills" className={`${T.link} inline-flex items-center gap-1.5 text-sm`}>
                                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                                Back to Bills
                            </Link>
                        }
                    />
                </div>
            </div>
        );
    }

    const riskFlags: RiskFlag[] = bill.risk_flags ? JSON.parse(bill.risk_flags) : [];
    const duplicateFlag = riskFlags.find((f) => f.flag_type === "duplicate_invoice");

    return (
        <div className={T.page}>
            {/* Header */}
            <Link href="/bills" className={`${T.link} mb-6 inline-flex items-center gap-1.5 text-sm`}>
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back to Bills
            </Link>

            <PageHeader
                title={bill.file_name}
                subtitle={`Bill #${bill.id}`}
                action={
                    <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={bill.status} />
                        {/* ALWAYS show the process button so we can retry failures */}
                        <button
                            onClick={handleProcess}
                            disabled={processing}
                            className={T.btnPrimary}
                        >
                            {processing ? (
                                <>
                                    <Spinner className="h-4 w-4" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                                    {bill.status === "pending" ? "Process Bill" : "Reprocess Bill"}
                                </>
                            )}
                        </button>
                    </div>
                }
            />

            {/* ── DUPLICATE ENTRY BANNER ─────────────────────────────── */}
            {duplicateFlag && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
                    <div className="flex items-start gap-3">
                        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={1.75} />
                        <div className="flex-1">
                            <h2 className="font-display text-base font-semibold tracking-tight text-red-700">
                                DUPLICATE ENTRY — Not Counted in Reports
                            </h2>
                            <p className="mt-1.5 text-sm text-red-700">{duplicateFlag.message}</p>
                            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-700/80">
                                <Lightbulb className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
                                {duplicateFlag.recommendation}
                            </p>
                            {"existing_bill_id" in duplicateFlag && (
                                <Link
                                    href={`/bills/${(duplicateFlag as RiskFlag & { existing_bill_id: number }).existing_bill_id}`}
                                    className={`${T.btnGhost} mt-4`}
                                >
                                    View Original Bill
                                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 border-t border-red-200 pt-4">
                        <p className="text-xs text-[#555]">
                            All extracted data shown below is for reference only.
                            This bill has been excluded from monthly summaries and exports.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Vendor & Invoice Info */}
                    <section className={T.card}>
                        <div className={T.cardHeader}>
                            <h2 className={T.h2}>Invoice Details</h2>
                        </div>
                        <dl className={list}>
                            <div className={row}>
                                <dt className={dt}>Vendor</dt>
                                <dd className={`${dd} text-right`}>{bill.vendor_name || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>GSTIN</dt>
                                <dd className="tabular text-xs text-[#0a0a0a]">{bill.vendor_gstin || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>Invoice No.</dt>
                                <dd className={`${dd} tabular text-right`}>{bill.invoice_number || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>Date</dt>
                                <dd className={`${dd} tabular`}>
                                    {bill.invoice_date
                                        ? new Date(bill.invoice_date).toLocaleDateString("en-IN")
                                        : "—"}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* Financial Breakdown */}
                    <section className={T.card}>
                        <div className={T.cardHeader}>
                            <h2 className={T.h2}>Financial Breakdown</h2>
                        </div>
                        <dl className={list}>
                            {/* Subtotal */}
                            <div className={row}>
                                <dt className={dt}>Subtotal</dt>
                                <dd className={`${dd} tabular`}>₹{(bill.subtotal || 0).toLocaleString("en-IN")}</dd>
                            </div>

                            {/* Discount — always visible */}
                            <div className={row}>
                                <dt className={bill.discount > 0 ? "text-[11px] uppercase tracking-wider text-amber-700" : dt}>
                                    Discount
                                </dt>
                                <dd className={bill.discount > 0 ? "tabular text-sm text-amber-700" : "tabular text-sm text-[#888]"}>
                                    {bill.discount > 0
                                        ? `− ₹${bill.discount.toLocaleString("en-IN")}`
                                        : "₹0"}
                                </dd>
                            </div>

                            {/* Net Taxable Amount — always visible, = Subtotal − Discount */}
                            <div className={row}>
                                <dt className="text-[11px] uppercase tracking-wider text-[#555]">Net Taxable Amount</dt>
                                <dd className="tabular text-sm font-semibold text-[#0a0a0a]">
                                    ₹{
                                        (
                                            bill.net_taxable_amount != null && bill.net_taxable_amount !== 0
                                                ? bill.net_taxable_amount
                                                : (bill.subtotal || 0) - (bill.discount || 0)
                                        ).toLocaleString("en-IN")
                                    }
                                </dd>
                            </div>

                            <div className={row}>
                                <dt className={dt}>CGST</dt>
                                <dd className={`${dd} tabular`}>₹{(bill.cgst || 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>SGST</dt>
                                <dd className={`${dd} tabular`}>₹{(bill.sgst || 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>IGST</dt>
                                <dd className={`${dd} tabular`}>₹{(bill.igst || 0).toLocaleString("en-IN")}</dd>
                            </div>
                            <div className={`${row} bg-[#faf8f4]`}>
                                <dt className="text-[11px] uppercase tracking-wider text-[#0a0a0a]">Total</dt>
                                <dd className="tabular text-lg font-semibold text-[#0a0a0a]">
                                    ₹{(bill.total_amount || 0).toLocaleString("en-IN")}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* OCR Text */}
                    {bill.raw_ocr_text && (
                        <section className={T.card}>
                            <div className={T.cardHeader}>
                                <h2 className={T.h2}>OCR Extracted Text</h2>
                            </div>
                            <div className="p-5">
                                <pre className="max-h-64 overflow-x-auto whitespace-pre-wrap rounded-lg border border-[#e0e0e0] bg-[#faf8f4] p-4 text-xs leading-relaxed text-[#555]">
                                    {bill.raw_ocr_text}
                                </pre>
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* AI Classification */}
                    <section className={T.card}>
                        <div className={T.cardHeader}>
                            <h2 className={`${T.h2} flex items-center gap-2`}>
                                <Bot className="h-4 w-4 text-[#888]" strokeWidth={1.75} />
                                <span>AI Classification</span>
                            </h2>
                        </div>
                        <dl className={list}>
                            <div className={row}>
                                <dt className={dt}>Category</dt>
                                <dd className="text-sm font-medium text-[#0a0a0a]">{bill.ai_category || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>Sub-category</dt>
                                <dd className={`${dd} text-right`}>{bill.ai_sub_category || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>Confidence</dt>
                                <dd>
                                    <span
                                        className={`${pill} tabular ${(bill.ai_confidence || 0) >= 0.7
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                            : (bill.ai_confidence || 0) >= 0.4
                                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                                : "bg-red-50 text-red-700 ring-red-200"
                                            }`}
                                    >
                                        {bill.ai_confidence != null
                                            ? `${(bill.ai_confidence * 100).toFixed(0)}%`
                                            : "—"}
                                    </span>
                                </dd>
                            </div>
                            {bill.ai_reasoning && (
                                <div className="px-5 py-3">
                                    <dt className={`${dt} mb-1.5`}>Reasoning</dt>
                                    <dd className="rounded-lg border border-[#e0e0e0] bg-[#faf8f4] p-3 text-xs leading-relaxed text-[#555]">
                                        {bill.ai_reasoning}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    {/* Rule Engine Decisions */}
                    <section className={T.card}>
                        <div className={T.cardHeader}>
                            <h2 className={`${T.h2} flex items-center gap-2`}>
                                <Scale className="h-4 w-4 text-[#888]" strokeWidth={1.75} />
                                <span>Rule Engine Decisions (Final)</span>
                            </h2>
                        </div>
                        <dl className={list}>
                            <div className={row}>
                                <dt className={dt}>Final Category</dt>
                                <dd className="text-sm font-medium text-[#0a0a0a]">{bill.final_category || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>GST Applicable</dt>
                                <dd className={`${dd} inline-flex items-center gap-1.5`}>
                                    {bill.gst_applicable ? (
                                        <>
                                            <Check className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
                                            Yes
                                        </>
                                    ) : (
                                        <>
                                            <X className="h-4 w-4 text-red-600" strokeWidth={1.75} />
                                            No
                                        </>
                                    )}
                                </dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>GST Rate</dt>
                                <dd className="tabular text-sm font-medium text-[#0a0a0a]">{bill.gst_rate ?? "—"}%</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>HSN Code</dt>
                                <dd className="tabular text-sm text-[#0a0a0a]">{bill.hsn_code || "—"}</dd>
                            </div>
                            <div className={row}>
                                <dt className={dt}>ITC Eligible</dt>
                                <dd>
                                    <span
                                        className={`${pill} ${bill.itc_eligible
                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                            : "bg-red-50 text-red-700 ring-red-200"
                                            }`}
                                    >
                                        {bill.itc_eligible ? (
                                            <>
                                                <Check className="h-4 w-4" strokeWidth={2} />
                                                Claimable
                                            </>
                                        ) : (
                                            <>
                                                <X className="h-4 w-4" strokeWidth={2} />
                                                Blocked
                                            </>
                                        )}
                                    </span>
                                </dd>
                            </div>
                            {bill.itc_blocked_reason && (
                                <div className="px-5 py-3">
                                    <dt className={`${dt} mb-1.5`}>Block Reason</dt>
                                    <dd className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                                        {bill.itc_blocked_reason}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    {/* Risk Flags */}
                    {riskFlags.length > 0 && (
                        <section className={T.card}>
                            <div className={T.cardHeader}>
                                <h2 className={`${T.h2} flex items-center gap-2`}>
                                    <TriangleAlert className="h-4 w-4 text-amber-600" strokeWidth={1.75} />
                                    <span>Risk Flags (<span className="tabular">{riskFlags.length}</span>)</span>
                                </h2>
                            </div>
                            <div className={list}>
                                {riskFlags.map((flag, i) => (
                                    <div key={i} className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <SeverityBadge severity={flag.severity} />
                                            <span className="text-sm text-[#0a0a0a]">{flag.message}</span>
                                        </div>
                                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[#888]">
                                            <Lightbulb className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
                                            {flag.recommendation}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Audit Trail */}
                    {bill.audit_logs.length > 0 && (
                        <section className={T.card}>
                            <div className={T.cardHeader}>
                                <h2 className={`${T.h2} flex items-center gap-2`}>
                                    <History className="h-4 w-4 text-[#888]" strokeWidth={1.75} />
                                    <span>Audit Trail</span>
                                </h2>
                            </div>
                            <div className={list}>
                                {bill.audit_logs.map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 px-5 py-3 text-xs">
                                        <span className="tabular whitespace-nowrap text-[#888]">
                                            {new Date(log.created_at).toLocaleTimeString("en-IN")}
                                        </span>
                                        <div>
                                            <span className="font-medium text-[#0a0a0a]">
                                                {log.action.replace(/_/g, " ")}
                                            </span>
                                            <span className="ml-1 text-[#888]">by {log.performed_by}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
