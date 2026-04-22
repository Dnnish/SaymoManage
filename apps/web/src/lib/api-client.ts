class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as { message?: string; error?: string };
      if (data.message) message = data.message;
      else if (data.error) message = data.error;
    } catch {
      // ignore parse errors — keep statusText as message
    }
    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(url: string): Promise<T> => request<T>("GET", url),
  post: <T>(url: string, body?: unknown): Promise<T> =>
    request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown): Promise<T> =>
    request<T>("PATCH", url, body),
  delete: <T>(url: string): Promise<T> => request<T>("DELETE", url),
};

export { ApiError };
