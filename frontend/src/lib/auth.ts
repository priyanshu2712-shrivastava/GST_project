/**
 * Auth Token Helpers
 * ==================
 * Centralized management of JWT tokens for multi-company auth.
 * All auth state lives here — components just call these functions.
 */

const TOKEN_KEY = "gst_auth_token";
const COMPANY_KEY = "gst_company_info";

export interface CompanyInfo {
  company_id: number;
  company_name: string;
  email: string;
  business_type: string;
}

/** Save the JWT token to localStorage after login/register */
export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/** Get the stored JWT token */
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/** Save company info alongside token */
export function setCompanyInfo(info: CompanyInfo): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(info));
  }
}

/** Get stored company info */
export function getCompanyInfo(): CompanyInfo | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Check if the user is currently authenticated (has a token) */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Clear all auth data — used on logout */
export function clearAuth(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(COMPANY_KEY);
  }
}

/** Returns the Authorization header for protected API calls */
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Returns the Authorization header (without Content-Type, for FormData) */
export function getAuthHeadersForUpload(): HeadersInit {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}
