const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getToken(): string | null {
  return localStorage.getItem("erp_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("erp_token", token);
  else localStorage.removeItem("erp_token");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const token = getToken();
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = payload?.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiClientError(res.status, message, payload?.error?.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
