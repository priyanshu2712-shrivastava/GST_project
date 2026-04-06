"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { useRouter } from "next/navigation";

const features = [
    {
        icon: "🔍",
        title: "Smart OCR Extraction",
        description: "AI-powered OCR reads bill images and PDFs, extracting vendor info, line items, amounts, and GST details automatically.",
        color: "from-blue-500/20 to-cyan-500/20",
        border: "border-blue-500/20",
    },
    {
        icon: "🤖",
        title: "AI Expense Classification",
        description: "LangChain + Gemini classifies each bill as raw material, office supply, travel, etc. — contextualized to YOUR business type.",
        color: "from-violet-500/20 to-purple-500/20",
        border: "border-violet-500/20",
    },
    {
        icon: "⚖️",
        title: "GST & ITC Rule Engine",
        description: "Deterministic rule engine applies Section 17(5) to assess ITC eligibility and GST rates — AI suggests, rules decide.",
        color: "from-emerald-500/20 to-teal-500/20",
        border: "border-emerald-500/20",
    },
    {
        icon: "📊",
        title: "Excel & Tally Export",
        description: "Generate monthly GST reports as Excel (3-sheet summary) or Tally-compatible XML for direct import into Tally Prime.",
        color: "from-orange-500/20 to-amber-500/20",
        border: "border-orange-500/20",
    },
    {
        icon: "🏢",
        title: "Multi-Company Support",
        description: "Each business has its own secure account. Bills, exports, and AI context are completely isolated per company.",
        color: "from-pink-500/20 to-rose-500/20",
        border: "border-pink-500/20",
    },
    {
        icon: "🔒",
        title: "Compliance Audit Trail",
        description: "Every AI decision, rule engine output, and override is logged. Full traceability for CA review and GST audits.",
        color: "from-indigo-500/20 to-blue-500/20",
        border: "border-indigo-500/20",
    },
];

const steps = [
    { num: "01", title: "Register Your Company", desc: "Create an account with your business type and description. The AI uses this context to classify your bills accurately." },
    { num: "02", title: "Upload Bills", desc: "Drag & drop invoice images or PDFs — single or bulk upload. Supports JPG, PNG, PDF, TIFF formats." },
    { num: "03", title: "AI Processes Everything", desc: "OCR extracts text → AI classifies expense → Rule engine determines GST rate and ITC eligibility automatically." },
    { num: "04", title: "Export & File", desc: "Download monthly Excel reports or Tally XML. Share with your CA, file GST returns with confidence." },
];

export default function LandingPage() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        // If already logged in, redirect to dashboard
        if (isAuthenticated()) {
            router.replace("/dashboard");
        } else {
            setChecked(true);
        }
    }, [router]);

    if (!checked) return null;

    return (
        <div className="min-h-screen bg-gray-950 overflow-hidden">
            {/* Hero */}
            <section className="relative pt-20 pb-32 px-4">
                {/* Background glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        AI-Powered GST Bill Digitization
                    </div>

                    <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
                        GST Bill Processing
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            for Every Business
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Upload your purchase invoices, let AI extract and classify them, apply GST rules automatically, and export ready-to-file reports — all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            id="hero-register-btn"
                            href="/register"
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-base hover:from-indigo-600 hover:to-violet-700 transition-all shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                        >
                            Register Free →
                        </Link>
                        <Link
                            id="hero-login-btn"
                            href="/login"
                            className="px-8 py-4 rounded-xl border border-gray-700 text-gray-300 font-semibold text-base hover:border-gray-500 hover:text-white transition-all hover:-translate-y-0.5"
                        >
                            Sign In
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-sm text-gray-500">
                        <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No credit card required</span>
                        <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Multi-company support</span>
                        <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Section 17(5) ITC rules</span>
                        <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Tally XML export</span>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">Everything You Need for GST Compliance</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">From raw invoice image to filed GST return — automated and accurate.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className={`rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.color} p-6 hover:scale-[1.02] transition-transform duration-200`}
                            >
                                <div className="text-3xl mb-4">{feature.icon}</div>
                                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 px-4 bg-gray-900/30">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-gray-400">Four simple steps from upload to compliance</p>
                    </div>

                    <div className="space-y-6">
                        {steps.map((step, i) => (
                            <div key={step.num} className="flex gap-6 items-start group">
                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm group-hover:from-indigo-500/30 group-hover:to-violet-500/30 transition-all">
                                    {step.num}
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-white font-semibold text-lg mb-1">{step.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="hidden" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-12">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Ready to Digitize Your Bills?
                        </h2>
                        <p className="text-gray-400 mb-8">
                            Register your company in 60 seconds. Your bills are completely private and isolated from other companies.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                id="cta-register-btn"
                                href="/register"
                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-xl shadow-indigo-500/30"
                            >
                                Get Started Free
                            </Link>
                            <Link
                                id="cta-login-btn"
                                href="/login"
                                className="px-8 py-4 rounded-xl border border-gray-700 text-gray-300 font-semibold hover:border-gray-500 hover:text-white transition-all"
                            >
                                I already have an account
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-800/50 py-8 px-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs">
                            GST
                        </div>
                        <span>BillDigitizer — AI-Powered GST Compliance</span>
                    </div>
                    <span>Built with FastAPI + Next.js + LangChain</span>
                </div>
            </footer>
        </div>
    );
}
