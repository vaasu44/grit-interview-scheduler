export async function api(path, { method = "GET", body, user } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-User-Id": String(user?.id ?? "") },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Something went wrong");
  return data;
}
