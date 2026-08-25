"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Check,
    ScanText,
    Tags,
    Scale,
    FileSpreadsheet,
    Building2,
    ShieldCheck,
    ReceiptText,
    type LucideIcon,
} from "lucide-react";

const features: { Icon: LucideIcon; title: string; description: string }[] = [
    {
        Icon: ScanText,
        title: "OCR extraction",
        description:
            "Reads images and PDFs, pulling vendor, GSTIN, invoice number, line items, and the CGST / SGST / IGST split.",
    },
    {
        Icon: Tags,
        title: "Expense classification",
        description:
            "Categorises each bill against your business type — raw material, freight, office supply — with a confidence score you can override.",
    },
    {
        Icon: Scale,
        title: "Section 17(5) rule engine",
        description:
            "A deterministic engine decides ITC eligibility and GST rate. The model suggests; the rules decide.",
    },
    {
        Icon: FileSpreadsheet,
        title: "Excel & Tally export",
        description:
            "Generate a 3-sheet monthly Excel workbook or Tally-ready XML for direct import into Tally Prime.",
    },
    {
        Icon: Building2,
        title: "Per-company isolation",
        description:
            "Every company has its own account. Bills, exports, and classification context stay fully separated.",
    },
    {
        Icon: ShieldCheck,
        title: "Audit trail",
        description:
            "Every extraction, rule decision, and manual override is logged and traceable for CA review and GST audits.",
    },
];

const steps = [
    {
        num: "01",
        title: "Register your company",
        desc: "Add your business type and a short description. This is the context used to classify your bills.",
    },
    {
        num: "02",
        title: "Upload bills",
        desc: "Drag in invoice images or PDFs, one at a time or in bulk. JPG, PNG, PDF, and TIFF are supported.",
    },
    {
        num: "03",
        title: "Review the results",
        desc: "OCR extracts the data, the bill is classified, and the rule engine sets GST rate and ITC eligibility.",
    },
    {
        num: "04",
        title: "Export & file",
        desc: "Download the monthly Excel or Tally XML, hand it to your CA, and file with a clear audit trail.",
    },
];

const trust = [
    "No credit card required",
    "Section 17(5) ITC rules",
    "Excel & Tally export",
    "Per-company isolation",
];

/* ── Landing page — femur-style minimalism ──────────────────────────────
   Palette: cream #f5f0eb · near-black #0a0a0a · muted #555 · hairline
   #e0e0e0 · one lime accent #f0ff44 · dark inverse band #0a0a0a.        */

export default function LandingPage() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (isAuthenticated()) {
            router.replace("/dashboard");
        } else {
            setChecked(true);
        }
    }, [router]);

    if (!checked) return null;

    return (
        <div className="min-h-screen bg-[#f5f0eb] text-[#0a0a0a]">
            {/* Hero — text-forward, no motion */}
            <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-32">
                <span className="inline-flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.2em] text-[#555]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f0ff44] ring-1 ring-[#0a0a0a]/15" />
                    GST · purchase-bill automation
                </span>

                <h1 className="font-display mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-[#0a0a0a] md:text-7xl">
                    Turn purchase invoices into filed GST returns
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#555]">
                    Upload a bill and get the vendor, line items, GST split, and ITC eligibility
                    extracted and checked against Section 17(5) — ready to export to Excel or Tally.
                </p>

                <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <Link
                        id="hero-register-btn"
                        href="/register"
                        className="group inline-flex items-center gap-2 rounded-full bg-[#f0ff44] px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#e7f800]"
                    >
                        Create free account
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        id="hero-login-btn"
                        href="/login"
                        className="inline-flex items-center rounded-full border border-[#0a0a0a]/20 px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#f5f0eb]"
                    >
                        Sign in
                    </Link>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[#555]">
                    {trust.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-[#0a0a0a]" strokeWidth={2.5} /> {t}
                        </span>
                    ))}
                </div>
            </section>

            {/* What it does — quiet hairline grid, no cards, no motion */}
            <section className="border-t border-[#e0e0e0]">
                <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
                    <div className="max-w-2xl">
                        <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#555]">
                            What it does
                        </p>
                        <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
                            Built for GST compliance, not demos
                        </h2>
                        <p className="mt-4 text-[#555]">
                            From a raw invoice image to a filed return — each step is explainable and audit-ready.
                        </p>
                    </div>

                    <div className="mt-14 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
                        {features.map(({ Icon, title, description }) => (
                            <div
                                key={title}
                                className="border-t border-[#e0e0e0] py-8 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
                            >
                                <Icon className="h-5 w-5 text-[#000000]" strokeWidth={1.5} />
                                <h3 className="font-display mt-4 text-lg font-semibold text-[#0a0a0a]">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#555]">
                                    {description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works — the single dark inverse band for contrast */}
            <section className="bg-[#0a0a0a] text-[#f5f0eb]">
                <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
                    <div className="max-w-2xl">
                        <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#9b9b9b]">
                            How it works
                        </p>
                        <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[#f5f0eb] md:text-5xl">
                            Four steps, upload to return
                        </h2>
                    </div>

                    <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
                        {steps.map((s) => (
                            <div key={s.num} className="border-t border-[#1f1f1f] pt-6">
                                <span className="tabular text-sm font-semibold text-[#f0ff44]">
                                    {s.num}
                                </span>
                                <h3 className="font-display mt-3 text-lg font-semibold text-[#f5f0eb]">
                                    {s.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#9b9b9b]">
                                    {s.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-[#e0e0e0]">
                <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
                    <h2 className="font-display text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
                        Start with your next invoice
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-[#555]">
                        Register in about a minute. Your bills stay private and isolated from every other
                        company on the platform.
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            id="cta-register-btn"
                            href="/register"
                            className="group inline-flex items-center gap-2 rounded-full bg-[#f0ff44] px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#e7f800]"
                        >
                            Create free account
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            id="cta-login-btn"
                            href="/login"
                            className="inline-flex items-center rounded-full border border-[#0a0a0a]/20 px-6 py-3 text-sm font-semibold text-[#0a0a0a] transition-colors hover:border-[#0a0a0a]"
                        >
                            I already have an account
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#e0e0e0]">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-[#555] sm:flex-row">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0a0a0a] text-[#f5f0eb]">
                            <ReceiptText className="h-4 w-4" />
                        </div>
                        <span className="font-display font-semibold text-[#0a0a0a]">GST Ledger</span>
                    </div>
                    <span>Purchase-bill automation and GST reporting for Indian businesses.</span>
                </div>
            </footer>
        </div>
    );
}
