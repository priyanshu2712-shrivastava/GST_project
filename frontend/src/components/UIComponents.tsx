import type { LucideIcon } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────
   Shared design tokens — the single source of truth for the app's look.
   Palette mirrors the landing page: cream #f5f0eb, near-black #0a0a0a,
   muted #555, faint #888, hairline #e0e0e0, one lime accent #f0ff44.
   Import as `T` and spread into className strings so every page matches.
   ────────────────────────────────────────────────────────────────────── */

export const T = {
    /* Layout */
    page: "mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8",
    pageNarrow: "mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8",

    /* Type */
    h1: "font-display text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-4xl",
    h2: "font-display text-base font-semibold text-[#0a0a0a]",
    sub: "mt-1.5 text-sm text-[#555]",
    eyebrow: "text-[12px] font-medium uppercase tracking-[0.2em] text-[#555]",
    muted: "text-[#555]",
    faint: "text-[#888]",

    /* Surfaces */
    card: "rounded-xl border border-[#e0e0e0] bg-white",
    cardHeader: "flex items-center justify-between border-b border-[#e0e0e0] px-5 py-4",
    divider: "border-[#e0e0e0]",

    /* Tables */
    theadRow: "border-b border-[#e0e0e0] text-left text-[11px] uppercase tracking-wider text-[#888]",
    th: "px-5 py-3 font-medium",
    tbody: "divide-y divide-[#ececec]",
    tr: "transition-colors hover:bg-[#faf8f4]",
    td: "px-5 py-3 text-[#555]",
    tdStrong: "px-5 py-3 font-medium text-[#0a0a0a]",

    /* Buttons */
    btnPrimary:
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#f0ff44] px-5 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#e7f800] disabled:cursor-not-allowed disabled:opacity-50",
    btnSecondary:
        "inline-flex items-center justify-center gap-2 rounded-full border border-[#0a0a0a]/20 px-5 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#f5f0eb] disabled:opacity-40",
    btnGhost:
        "inline-flex items-center gap-1.5 rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs font-medium text-[#555] transition-colors hover:border-[#0a0a0a] hover:text-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-30",
    chip: "inline-flex items-center rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-xs font-medium text-[#555] transition-colors hover:border-[#0a0a0a] hover:text-[#0a0a0a]",
    chipActive:
        "inline-flex items-center rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-[#f5f0eb]",

    /* Forms */
    input:
        "w-full rounded-lg border border-[#e0e0e0] bg-white px-4 py-3 text-sm text-[#0a0a0a] placeholder-[#aaa] transition-colors focus:border-[#0a0a0a] focus:outline-none",
    label: "mb-1.5 block text-sm font-medium text-[#0a0a0a]",
    help: "mt-1.5 text-xs text-[#888]",

    /* Misc */
    link: "font-medium text-[#0a0a0a] underline decoration-[#0a0a0a]/25 underline-offset-2 transition-colors hover:decoration-[#0a0a0a]",
    errorBox: "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700",
    tagPill: "inline-flex items-center rounded-full bg-[#f5f0eb] px-2 py-0.5 text-[11px] text-[#555]",
} as const;

/* ── Primitives ─────────────────────────────────────────────────────── */

export function Spinner({ className = "h-8 w-8" }: { className?: string }) {
    return (
        <span
            role="status"
            aria-label="Loading"
            className={`inline-block animate-spin rounded-full border-2 border-[#0a0a0a]/15 border-t-[#0a0a0a] ${className}`}
        />
    );
}

export function PageHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className={T.h1}>{title}</h1>
                {subtitle && <p className={T.sub}>{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function EmptyState({
    Icon,
    title,
    action,
}: {
    Icon: LucideIcon;
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="px-6 py-16 text-center">
            <Icon className="mx-auto h-7 w-7 text-[#c9c2b8]" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-[#555]">{title}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

/* ── Badges ─────────────────────────────────────────────────────────── */

export function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { cls: string; dot: string }> = {
        pending: { cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
        processing: { cls: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
        processed: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
        review_needed: { cls: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" },
        error: { cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
    };

    const c = config[status] || config.pending;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${c.cls}`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${c.dot} ${status === "processing" ? "animate-pulse-dot" : ""}`}
            />
            {status.replace(/_/g, " ")}
        </span>
    );
}

export function SeverityBadge({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        high: "bg-red-50 text-red-700 ring-red-200",
        medium: "bg-amber-50 text-amber-700 ring-amber-200",
        low: "bg-[#f5f0eb] text-[#555] ring-[#e0e0e0]",
    };

    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${colors[severity] || colors.low}`}
        >
            {severity}
        </span>
    );
}

/* ── KPI ────────────────────────────────────────────────────────────── */

export function KPICard({
    title,
    value,
    subtitle,
    Icon,
    tone = "neutral",
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    Icon?: LucideIcon;
    tone?: "neutral" | "positive" | "warn";
}) {
    const iconTone =
        tone === "positive"
            ? "text-emerald-600"
            : tone === "warn"
                ? "text-amber-600"
                : "text-[#888]";

    return (
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 transition-colors hover:border-[#0a0a0a]/25">
            <div className="flex items-start justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#888]">{title}</p>
                {Icon && <Icon className={`h-4 w-4 ${iconTone}`} strokeWidth={1.75} />}
            </div>
            <p className="tabular mt-3 text-2xl font-semibold text-[#0a0a0a]">
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </p>
            {subtitle && <p className="mt-1 text-xs text-[#888]">{subtitle}</p>}
        </div>
    );
}
