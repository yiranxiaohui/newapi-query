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

async function fetchUserSelf(apiBase, tokenKey) {
  const resp = await proxyFetch(`${apiBase}/api/user/self`, {
    headers: { 'Authorization': tokenKey },
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) {
    throw new Error(data.message || `请求失败 (${resp.status})`);
  }
  return data.data;
}

async function fetchBillingSubscription(apiBase, tokenKey) {
  const resp = await proxyFetch(`${apiBase}/v1/dashboard/billing/subscription`, {
    headers: { 'Authorization': `Bearer ${tokenKey}` },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error?.message || `请求失败 (${resp.status})`);
  }
  const totalUsd = data.hard_limit_usd ?? data.system_hard_limit_usd ?? 0;
  const usedUsd = totalUsd - (data.soft_limit_usd ?? totalUsd);
  return {
    quota: Math.round(totalUsd * 500000),
    used_quota: Math.round(usedUsd * 500000),
  };
}

export async function fetchQuotaInfo(apiBase, tokenKey) {
  // 策略1: 尝试 /api/user/self（Session Token 可用时生效）
  try {
    const user = await fetchUserSelf(apiBase, tokenKey);
    if (user && user.quota !== undefined) return user;
  } catch (e) {
    console.warn('[额度查询] /api/user/self 失败:', e.message);
  }

  // 策略2: 尝试 OpenAI 兼容的 billing 端点（API Token 可用）
  try {
    return await fetchBillingSubscription(apiBase, tokenKey);
  } catch (e) {
    console.warn('[额度查询] /v1/dashboard/billing/subscription 失败:', e.message);
  }

  return null;
}
