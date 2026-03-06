/**
 * Backend API Client
 * ==================
 * Typed fetch wrapper for all backend endpoints.
 * Centralizes API calls so every page uses the same pattern.
 * 
 * Base URL points to FastAPI backend on port 8000.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------- Types ----------

export interface Bill {
  id: number;
  file_name: string;
  file_type: string | null;
  vendor_name: string | null;
  vendor_gstin: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
  raw_ocr_text: string | null;
  ai_category: string | null;
  ai_sub_category: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  final_category: string | null;
  gst_applicable: boolean | null;
  gst_rate: number | null;
  itc_eligible: boolean | null;
  itc_blocked_reason: string | null;
  hsn_code: string | null;
  status: string;
  risk_flags: string | null;
  needs_manual_review: boolean;
  created_at: string;
  updated_at: string;
  line_items: BillLineItem[];
  audit_logs: AuditLog[];
}

export interface BillLineItem {
  id: number;
  description: string | null;
  hsn_code: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  itc_eligible: boolean;
  itc_blocked_reason: string | null;
}

export interface AuditLog {
  id: number;
  action: string;
  details: string | null;
  performed_by: string;
  created_at: string;
}

export interface BillListResponse {
  bills: Bill[];
  total: number;
  page: number;
  per_page: number;
}

export interface MonthlySummary {
  month: number;
  year: number;
  total_bills: number;
  total_amount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_gst: number;
  itc_eligible_amount: number;
  itc_blocked_amount: number;
  bills_needing_review: number;
  category_breakdown: Record<string, number>;
}

export interface UploadResponse {
  id: number;
  file_name: string;
  status: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  ai_available: boolean;
  business_type: string;
  confidence_threshold: number;
}

export interface RiskFlag {
  flag_type: string;
  severity: string;
  message: string;
  recommendation: string;
}

// ---------- API Functions ----------

export async function uploadBill(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/bills/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadBillsBulk(files: File[]): Promise<{ uploaded: UploadResponse[]; failed: { file_name: string; error: string }[] }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_BASE}/api/bills/upload-bulk`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function processBill(billId: number): Promise<Bill> {
  const res = await fetch(`${API_BASE}/api/bills/${billId}/process`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBill(billId: number): Promise<Bill> {
  const res = await fetch(`${API_BASE}/api/bills/${billId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listBills(params?: {
  status?: string;
  month?: number;
  year?: number;
  page?: number;
  per_page?: number;
}): Promise<BillListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.month) query.set("month", String(params.month));
  if (params?.year) query.set("year", String(params.year));
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  const res = await fetch(`${API_BASE}/api/bills/?${query.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMonthlySummary(month: number, year: number): Promise<MonthlySummary> {
  const res = await fetch(`${API_BASE}/api/summary/monthly?month=${month}&year=${year}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getExcelDownloadUrl(month: number, year: number): string {
  return `${API_BASE}/api/export/excel?month=${month}&year=${year}`;
}

export function getTallyXmlDownloadUrl(month: number, year: number): string {
  return `${API_BASE}/api/export/tally-xml?month=${month}&year=${year}`;
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
