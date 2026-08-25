"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginCompany } from "@/lib/api";
import { setToken, setCompanyInfo } from "@/lib/auth";
import { T, Spinner } from "@/components/UIComponents";
import { ReceiptText, TriangleAlert } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await loginCompany(form.email, form.password);
            setToken(res.access_token);
            setCompanyInfo({
                company_id: res.company_id,
                company_name: res.company_name,
                email: res.email,
                business_type: res.business_type,
            });
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="rounded-2xl border border-[#e0e0e0] bg-white p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a0a0a] text-[#f5f0eb]">
                            <ReceiptText className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight text-[#0a0a0a]">
                            Welcome back
                        </h1>
                        <p className="mt-1.5 text-sm text-[#555]">Sign in to your company account</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className={`mb-5 flex items-start gap-2.5 ${T.errorBox}`}>
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={T.label}>Email address</label>
                            <input
                                id="login-email"
                                type="email"
                                required
                                autoComplete="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={T.input}
                                placeholder="company@example.com"
                            />
                        </div>

                        <div>
                            <label className={T.label}>Password</label>
                            <input
                                id="login-password"
                                type="password"
                                required
                                autoComplete="current-password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className={T.input}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className={`w-full ${T.btnPrimary}`}
                        >
                            {loading ? (
                                <>
                                    <Spinner className="h-4 w-4" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-[#555]">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className={T.link}>
                        Register your company
                    </Link>
                </p>
            </div>
        </div>
    );
}
