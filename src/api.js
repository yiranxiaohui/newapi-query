function proxyFetch(url, options = {}) {
  const parsed = new URL(url);
  return fetch('/cors-proxy' + parsed.pathname + parsed.search, {
    ...options,
    headers: {
      ...options.headers,
      'X-Proxy-Target': parsed.origin,
    },
  });
}

export async function fetchTokenLogs(apiBase, tokenKey, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ p: page, page_size: pageSize });
  const resp = await proxyFetch(`${apiBase}/api/log/token?${params}`, {
    headers: { 'Authorization': tokenKey },
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.message || `请求失败 (${resp.status})`);
  }
  return data.data;
}

// GET /api/usage/token/ — 令牌使用情况（Bearer Token 认证）
export async function fetchQuotaInfo(apiBase, tokenKey) {
  const resp = await proxyFetch(`${apiBase}/api/usage/token/`, {
    headers: { 'Authorization': `Bearer ${tokenKey}` },
  });
  const data = await resp.json();
  if (!resp.ok || !data.code) {
    throw new Error(data.message || `请求失败 (${resp.status})`);
  }
  const d = data.data;
  return {
    total: d.total_granted || 0,
    used: d.total_used || 0,
    remaining: d.total_available || 0,
    name: d.name,
    unlimited: d.unlimited_quota,
    expiresAt: d.expires_at,
  };
}
