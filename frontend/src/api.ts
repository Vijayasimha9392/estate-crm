export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
let csrf: { token: string; headerName: string } | null = null;
export async function resetCsrf() {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
  });
  if (!response.ok)
    throw new ApiError(
      "Could not initialize a secure session. Please retry.",
      response.status,
    );
  csrf = await response.json();
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  try {
    if (method !== "GET" && !csrf) await resetCsrf();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method !== "GET" && csrf) headers[csrf.headerName] = csrf.token;
    const response = await fetch("/api" + path, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: "Request failed. Please retry." }));
      if (
        response.status === 401 &&
        path !== "/auth/login" &&
        path !== "/auth/me"
      )
        window.dispatchEvent(new Event("session-expired"));
      if (response.status === 403) csrf = null;
      throw new ApiError(
        data.message || "Request failed.",
        response.status,
        data.fields,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  } catch (error) {
    if (
      error instanceof ApiError ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      throw error;
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    );
  }
}
