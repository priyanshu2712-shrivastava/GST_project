"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerCompanyAuth } from "@/lib/api";
import { setToken, setCompanyInfo } from "@/lib/auth";
import { T, Spinner } from "@/components/UIComponents";
import { TriangleAlert } from "lucide-react";

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
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
            <div className="w-full max-w-lg">
                {/* Card */}
                <div className="rounded-2xl border border-[#e0e0e0] bg-white p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="font-display inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a0a0a] text-sm font-semibold tracking-tight text-[#f5f0eb]">
                            GST
                        </div>
                        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight text-[#0a0a0a]">
                            Register Your Company
                        </h1>
                        <p className="mt-1.5 text-sm text-[#555]">
                            Set up your account to start processing bills
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className={`mb-5 flex items-start gap-2.5 ${T.errorBox}`}>
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Company Name */}
                        <div>
                            <label className={T.label}>Company Name *</label>
                            <input
                                id="reg-company-name"
                                type="text"
                                required
                                value={form.company_name}
                                onChange={(e) => update("company_name", e.target.value)}
                                className={T.input}
                                placeholder="ABC Trading Co."
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className={T.label}>Email Address *</label>
                            <input
                                id="reg-email"
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                className={T.input}
                                placeholder="company@example.com"
                            />
                        </div>

                        {/* Password Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={T.label}>Password *</label>
                                <input
                                    id="reg-password"
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => update("password", e.target.value)}
                                    className={T.input}
                                    placeholder="Min 6 chars"
                                />
                            </div>
                            <div>
                                <label className={T.label}>Confirm *</label>
                                <input
                                    id="reg-confirm-password"
                                    type="password"
                                    required
                                    value={form.confirm_password}
                                    onChange={(e) => update("confirm_password", e.target.value)}
                                    className={T.input}
                                    placeholder="Repeat password"
                                />
                            </div>
                        </div>

                        {/* Business Type */}
                        <div>
                            <label className={T.label}>Business Type *</label>
                            <select
                                id="reg-business-type"
                                value={form.business_type}
                                onChange={(e) => update("business_type", e.target.value)}
                                className={T.input}
                            >
                                {BUSINESS_TYPES.map((bt) => (
                                    <option key={bt} value={bt}>
                                        {bt.charAt(0).toUpperCase() + bt.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Business Description */}
                        <div>
                            <label className={T.label}>
                                Business Description *
                                <span className="ml-1 font-normal text-[#888]">(helps AI classify your bills)</span>
                            </label>
                            <textarea
                                id="reg-business-description"
                                required
                                rows={2}
                                value={form.business_description}
                                onChange={(e) => update("business_description", e.target.value)}
                                className={`${T.input} resize-none`}
                                placeholder="e.g. We are a wholesale electronics trading company supplying to retailers..."
                            />
                        </div>

                        {/* Optional Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={T.label}>GSTIN</label>
                                <input
                                    id="reg-gstin"
                                    type="text"
                                    maxLength={15}
                                    value={form.gstin}
                                    onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                                    className={`${T.input} tabular`}
                                    placeholder="27AAPFU0939F1ZV"
                                />
                            </div>
                            <div>
                                <label className={T.label}>Phone</label>
                                <input
                                    id="reg-phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => update("phone", e.target.value)}
                                    className={`${T.input} tabular`}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            id="reg-submit"
                            type="submit"
                            disabled={loading}
                            className={`w-full ${T.btnPrimary}`}
                        >
                            {loading ? (
                                <>
                                    <Spinner className="h-4 w-4" />
                                    Creating account...
                                </>
                            ) : "Create Company Account"}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-[#555]">
                    Already registered?{" "}
                    <Link href="/login" className={T.link}>
                        Sign in here
                    </Link>
                </p>
            </div>
        </div>
    );
}
