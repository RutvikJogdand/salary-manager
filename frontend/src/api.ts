import { useEffect, useState } from "react";

let csrfToken = "";
export function setCSRF(token: string) {
  csrfToken = token;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-CSRF-Token": csrfToken,
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(body.errors)
      ? body.errors
          .slice(0, 4)
          .map(
            (x: { field?: string; row?: number; message: string }) =>
              `${x.field || (x.row ? `Row ${x.row}` : "")}: ${x.message}`,
          )
          .join(" · ")
      : "";
    if (
      response.status === 401 &&
      path !== "/api/login" &&
      path !== "/api/session"
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      response.status,
      [body.message || "Request failed.", details].filter(Boolean).join(" "),
    );
  }
  return body;
}
export function useResource<T>(path: string | null, revision = 0) {
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ key: "", loading: true });
  const [retry, setRetry] = useState(0);
  const key = `${path}:${revision}:${retry}`;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState({ key, loading: true });
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    ...(state.key === key
      ? state
      : { loading: true, data: undefined, error: undefined }),
    retry: () => setRetry((value) => value + 1),
  };
}
export function query(values: Record<string, string | number | undefined>) {
  return new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== "" && v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}
