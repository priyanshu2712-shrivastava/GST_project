"use client";

import { useEffect, useState } from "react";
import { getCompany, updateCompany } from "@/lib/api";
import type { Company } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

const BUSINESS_TYPES = [
  "medicine",
  "trading",
  "manufacturing",
  "services",
  "retail",
  "wholesale",
  "export",
  "import",
  "construction",
  "hospitality",
  "other",
];

function CompanyContent() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    gstin: "",
    business_type: "medicine",
    business_description: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await getCompany();
        setCompany(data);
        setForm({
          company_name: data.company_name,
          gstin: data.gstin ?? "",
          business_type: data.business_type,
          business_description: data.business_description,
          address: data.address ?? "",
          phone: data.phone ?? "",
        });
      } catch {
        // Should not happen for registered user
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await updateCompany({
        ...form,
        gstin: form.gstin?.trim() || undefined,
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      });
      setCompany(saved);
      setSuccess("Company profile updated! AI will use your new settings on the next bill.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save company info");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Company Profile
        </h1>
        <p className="text-gray-500 mt-1">
          Update your business details — AI uses these to classify bills accurately
        </p>
        {company && (
          <p className="text-sm text-gray-500 mt-1">Logged in as: <span className="text-indigo-400">{company.email}</span></p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Current Profile Banner */}
          {company && (
            <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🏢</span>
                <div>
                  <p className="font-semibold text-white">{company.company_name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-indigo-400">{company.business_type}</span>
                    {company.gstin && (
                      <> &bull; GSTIN: <span className="text-gray-300">{company.gstin}</span></>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{company.business_description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
                Business Identity
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Company Name *</label>
                  <input
                    required
                    className={inputClass}
                    placeholder="e.g. Sharma Medical Stores Pvt Ltd"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>GSTIN</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. 27AAPFU0939F1ZV"
                    maxLength={15}
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Business Type *</label>
                  <select
                    required
                    className={inputClass}
                    value={form.business_type}
                    onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Business Description *</label>
                  <textarea
                    required
                    rows={3}
                    className={inputClass}
                    placeholder="e.g. A general medicine company that purchases medicine in raw or processed form from other companies and sells to individuals"
                    value={form.business_description}
                    onChange={(e) => setForm({ ...form, business_description: e.target.value })}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    This description helps the AI understand what bills are relevant for your business.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
                Contact Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Registered office address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            {success && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400">
                ✅ {success}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving...
                </span>
              ) : "Update Company Profile"}
            </button>
          </form>

          {/* AI Usage Note */}
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/30 p-4">
            <p className="text-xs text-gray-500">
              <span className="text-gray-300 font-medium">ℹ️ How this is used:</span> When you
              process a bill, the AI reads your <span className="text-indigo-400">Business Type</span>{" "}
              and <span className="text-indigo-400">Business Description</span> to decide if an
              expense is relevant. For example, a medicine bill would be &quot;raw material&quot; for a
              medicine company, but &quot;personal expense&quot; for a garment shop.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function CompanyPage() {
  return (
    <ProtectedRoute>
      <CompanyContent />
    </ProtectedRoute>
  );
}
