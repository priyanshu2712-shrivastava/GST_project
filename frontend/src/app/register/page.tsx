"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerCompanyAuth } from "@/lib/api";
import { setToken, setCompanyInfo } from "@/lib/auth";

const BUSINESS_TYPES = [
    "trading",
    "manufacturing",
    "services",
    "retail",
    "restaurant",
    "pharmacy",
    "healthcare",
    "construction",
    "technology",
    "education",
    "logistics",
    "agriculture",
    "other",
];

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        company_name: "",
        email: "",
        password: "",
        confirm_password: "",
        business_type: "trading",
        business_description: "",
        gstin: "",
        phone: "",
        address: "",
    });

    function update(key: string, val: string) {
        setForm((f) => ({ ...f, [key]: val }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (form.password !== form.confirm_password) {
            setError("Passwords do not match.");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await registerCompanyAuth({
                company_name: form.company_name,
                email: form.email,
                password: form.password,
                business_type: form.business_type,
                business_description: form.business_description,
                gstin: form.gstin || undefined,
                phone: form.phone || undefined,
                address: form.address || undefined,
            });
            setToken(res.access_token);
            setCompanyInfo({
                company_id: res.company_id,
                company_name: res.company_name,
                email: res.email,
                business_type: res.business_type,
            });
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                {/* Card */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/30 mb-4">
                            GST
                        </div>
                        <h1 className="text-2xl font-bold text-white">Register Your Company</h1>
                        <p className="text-gray-400 mt-1 text-sm">Set up your account to start processing bills</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name *</label>
                            <input
                                id="reg-company-name"
                                type="text"
                                required
                                value={form.company_name}
                                onChange={(e) => update("company_name", e.target.value)}
                                className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                                placeholder="ABC Trading Co."
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address *</label>
                            <input
                                id="reg-email"
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                                placeholder="company@example.com"
                            />
                        </div>

                        {/* Password Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password *</label>
                                <input
                                    id="reg-password"
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => update("password", e.target.value)}
                                    className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                                    placeholder="Min 6 chars"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm *</label>
                                <input
                                    id="reg-confirm-password"
                                    type="password"
                                    required
                                    value={form.confirm_password}
                                    onChange={(e) => update("confirm_password", e.target.value)}
                                    className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                                    placeholder="Repeat password"
                                />
                            </div>
                        </div>

                        {/* Business Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Business Type *</label>
                            <select
                                id="reg-business-type"
                                value={form.business_type}
                                onChange={(e) => update("business_type", e.target.value)}
                                className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                            >
                                {BUSINESS_TYPES.map((bt) => (
                                    <option key={bt} value={bt} className="bg-gray-800">
                                        {bt.charAt(0).toUpperCase() + bt.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Business Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Business Description *
                                <span className="text-gray-500 font-normal ml-1">(helps AI classify your bills)</span>
                            </label>
                            <textarea
                                id="reg-business-description"
                                required
                                rows={2}
                                value={form.business_description}
                                onChange={(e) => update("business_description", e.target.value)}
                                className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm resize-none"
                                placeholder="e.g. We are a wholesale electronics trading company supplying to retailers..."
                            />
                        </div>

                        {/* Optional Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">GSTIN</label>
                                <input
                                    id="reg-gstin"
                                    type="text"
                                    maxLength={15}
                                    value={form.gstin}
                                    onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                                    className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-mono"
                                    placeholder="27AAPFU0939F1ZV"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label>
                                <input
                                    id="reg-phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => update("phone", e.target.value)}
                                    className="w-full rounded-xl bg-gray-800/60 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="reg-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Creating account...
                                </span>
                            ) : "Create Company Account"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already registered?{" "}
                        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
