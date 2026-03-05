function proxyFetch(url, options = {}) {
  if (import.meta.env.DEV) {
    const parsed = new URL(url);
    return fetch('/cors-proxy' + parsed.pathname + parsed.search, {
      ...options,
      headers: {
        ...options.headers,
        'X-Proxy-Target': parsed.origin,
      },
    });
  }
  return fetch(url, options);
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

export async function fetchTokenQuota(apiBase, tokenKey) {
  const resp = await proxyFetch(`${apiBase}/api/user/self`, {
    headers: { 'Authorization': tokenKey },
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.message || `请求失败 (${resp.status})`);
  }
  return data.data;
}
