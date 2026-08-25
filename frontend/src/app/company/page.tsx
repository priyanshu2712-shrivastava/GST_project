"use client";

import { useEffect, useState } from "react";
import { getCompany, updateCompany } from "@/lib/api";
import type { Company } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { T, Spinner, PageHeader } from "@/components/UIComponents";
import { AlertCircle, Building2, CheckCircle2, Info } from "lucide-react";

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

  return (
    <div className={T.pageNarrow}>
      {/* Header */}
      <PageHeader
        title="Company Profile"
        subtitle="Update your business details — AI uses these to classify bills accurately"
        action={
          company ? (
            <p className="text-sm text-[#888]">
              Logged in as: <span className="text-[#0a0a0a]">{company.email}</span>
            </p>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Current Profile Banner */}
          {company && (
            <div className={`${T.card} mb-6 p-5`}>
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e0e0e0] bg-[#f5f0eb]">
                  <Building2 className="h-5 w-5 text-[#0a0a0a]" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-display font-semibold tracking-tight text-[#0a0a0a]">
                    {company.company_name}
                  </p>
                  <p className="mt-0.5 text-sm text-[#555]">
                    <span className="capitalize">{company.business_type}</span>
                    {company.gstin && (
                      <> &bull; GSTIN: <span className="tabular text-[#0a0a0a]">{company.gstin}</span></>
                    )}
                  </p>
                  <p className="mt-1.5 text-xs text-[#888]">{company.business_description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={T.card}>
              <div className={T.cardHeader}>
                <h2 className={T.h2}>Business Identity</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={T.label}>Company Name *</label>
                  <input
                    required
                    className={T.input}
                    placeholder="e.g. Sharma Medical Stores Pvt Ltd"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={T.label}>GSTIN</label>
                  <input
                    className={`${T.input} tabular`}
                    placeholder="e.g. 27AAPFU0939F1ZV"
                    maxLength={15}
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className={T.label}>Business Type *</label>
                  <select
                    required
                    className={T.input}
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
                  <label className={T.label}>Business Description *</label>
                  <textarea
                    required
                    rows={3}
                    className={T.input}
                    placeholder="e.g. A general medicine company that purchases medicine in raw or processed form from other companies and sells to individuals"
                    value={form.business_description}
                    onChange={(e) => setForm({ ...form, business_description: e.target.value })}
                  />
                  <p className={T.help}>
                    This description helps the AI understand what bills are relevant for your business.
                  </p>
                </div>
              </div>
            </div>

            <div className={T.card}>
              <div className={T.cardHeader}>
                <h2 className={T.h2}>Contact Details</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={T.label}>Address</label>
                  <textarea
                    rows={2}
                    className={T.input}
                    placeholder="Registered office address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className={T.label}>Phone</label>
                  <input
                    type="tel"
                    className={`${T.input} tabular`}
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Messages */}
            {success && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.75} />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className={`${T.errorBox} flex items-start gap-2.5`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`${T.btnPrimary} w-full`}
            >
              {saving ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Saving...
                </>
              ) : "Update Company Profile"}
            </button>
          </form>

          {/* AI Usage Note */}
          <div className={`${T.card} mt-6 p-5`}>
            <p className="text-xs leading-relaxed text-[#888]">
              <span className="mr-1 inline-flex items-center gap-1.5 font-medium text-[#0a0a0a]">
                <Info className="h-4 w-4 text-[#888]" strokeWidth={1.75} />
                How this is used:
              </span>{" "}
              When you process a bill, the AI reads your{" "}
              <span className="font-medium text-[#0a0a0a]">Business Type</span>{" "}
              and <span className="font-medium text-[#0a0a0a]">Business Description</span> to decide if an
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
