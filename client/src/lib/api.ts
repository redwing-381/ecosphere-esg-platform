import axios from "axios";

// In production the API lives on a separate Vercel project, so its origin is
// injected at build time. In dev this is empty and Vite proxies "/api".
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const api = axios.create({ baseURL: `${API_ORIGIN}/api/v1` });

/** Resolve a stored proof path to a usable URL (absolute Blob URLs pass through). */
export function fileUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\//, "")}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Extract a human-readable message from an API error response. */
export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string }; detail?: unknown }
      | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  }
  return "Something went wrong. Please try again.";
}

export default api;
