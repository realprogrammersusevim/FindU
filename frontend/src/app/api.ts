const BASE = "http://localhost:8000"

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("auth_token")
  return fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
}
