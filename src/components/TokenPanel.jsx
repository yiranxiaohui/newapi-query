import { useState } from 'react';
import { fetchTokenLogs, fetchQuotaInfo } from '../api';
import { formatTime, formatQuota, TYPE_MAP, TYPE_CLASS } from '../utils';

const STORAGE_KEY = 'newapi_config';
const PAGE_SIZES = [20, 50, 100];

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function num(v) {
  if (v == null) return '-';
  return Number(v).toLocaleString();
}

export default function TokenPanel({ showToast }) {
  const saved = loadSaved();
  const [apiBase, setApiBase] = useState(saved.apiBase || '');
  const [tokenKey, setTokenKey] = useState(saved.tokenKey || '');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [queried, setQueried] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [quotaError, setQuotaError] = useState(false);

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiBase: apiBase.trim(), tokenKey: tokenKey.trim() }));
    showToast('配置已保存', 'success');
  }

  function clearConfig() {
    localStorage.removeItem(STORAGE_KEY);
    setApiBase('');
    setTokenKey('');
    showToast('配置已清除', 'info');
  }

  async function query(page = 1, size = pageSize) {
    const base = apiBase.trim().replace(/\/+$/, '');
    const key = tokenKey.trim();
    if (!base) { showToast('请填写 API 地址', 'info'); return; }
    if (!key) { showToast('请填写 Token Key', 'info'); return; }

    setError('');
    setLoading(true);
    setQueried(true);
    setQuotaError(false);

    try {
      const [data, quota] = await Promise.all([
        fetchTokenLogs(base, key, page, size),
        fetchQuotaInfo(base, key),
      ]);
      const list = (data?.logs || data || []).map(log => {
        let extra = {};
        if (log.other) {
          try { extra = typeof log.other === 'string' ? JSON.parse(log.other) : log.other; } catch {}
        }
        return { ...log, _other: extra };
      });
      setLogs(list);
      setTotal(data?.total ?? list.length);
      setCurrentPage(page);
      setConfigCollapsed(true);
      if (quota) {
        setQuotaInfo(quota);
      } else {
        setQuotaError(true);
      }
    } catch (e) {
      setError(e.message);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  function handlePageSizeChange(s) { setPageSize(s); query(1, s); }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalQuota = logs.reduce((s, l) => s + (l.quota || 0), 0);
  const totalCacheRead = logs.reduce((s, l) => s + (l._other?.cache_tokens || 0), 0);
  const totalCacheWrite = logs.reduce((s, l) => s + (l._other?.cache_creation_tokens || 0), 0);

  function getPageNumbers() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div>
      {/* Config */}
      <div className="card config-card">
        <div className="config-header" onClick={() => setConfigCollapsed(c => !c)}>
          <h2>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            连接配置
          </h2>
          <button className={`config-toggle ${configCollapsed ? 'collapsed' : ''}`} tabIndex={-1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div className={`config-body ${configCollapsed ? 'collapsed' : ''}`}>
          <div className="form-row">
            <div className="form-group">
              <label>API 地址</label>
              <input type="text" value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="https://your-newapi-site.com" onKeyDown={e => e.key === 'Enter' && query()} />
            </div>
            <div className="form-group">
              <label>Token Key</label>
              <input type="text" value={tokenKey} onChange={e => setTokenKey(e.target.value)} placeholder="sk-xxxxxxxxxxxxxxxx" onKeyDown={e => e.key === 'Enter' && query()} />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => query()} disabled={loading}>
              {loading ? <><span className="btn-spinner" /> 查询中...</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>查询日志</>}
            </button>
            <button className="btn btn-secondary" onClick={saveConfig}>保存配置</button>
            <button className="btn-icon" onClick={clearConfig} title="清除配置">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {error}
        </div>
      )}

      {loading && <div className="loading-state"><div className="spinner" /><div>正在查询日志...</div></div>}

      {!loading && !error && queried && logs.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/></svg>
          <p>暂无日志数据</p>
          <small>请检查 Token Key 是否正确</small>
        </div>
      )}

      {!loading && !error && !queried && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>填写配置后点击查询</p>
          <small>输入 API 地址和 Token Key 开始查询日志</small>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <>
          {/* Quota Cards */}
          {quotaInfo && (
            <div className="quota-bar">
              <div className="quota-stat">
                <div className="quota-stat-icon total">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <div className="quota-stat-text">
                  <span className="quota-stat-label">总额度</span>
                  <span className="quota-stat-value total">{formatQuota(quotaInfo.quota)}</span>
                </div>
              </div>
              <div className="quota-stat">
                <div className="quota-stat-icon used">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
                <div className="quota-stat-text">
                  <span className="quota-stat-label">已用额度</span>
                  <span className="quota-stat-value used">{formatQuota(quotaInfo.used_quota)}</span>
                </div>
              </div>
              <div className="quota-stat">
                <div className="quota-stat-icon remain">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div className="quota-stat-text">
                  <span className="quota-stat-label">剩余额度</span>
                  <span className="quota-stat-value remain">{formatQuota((quotaInfo.quota || 0) - (quotaInfo.used_quota || 0))}</span>
                </div>
              </div>
            </div>
          )}
          {quotaError && !quotaInfo && (
            <div className="quota-warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              无法获取额度信息，当前 Token 可能没有查询余额的权限
            </div>
          )}

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-chip">
              <div className="stat-chip-value records">{total.toLocaleString()}</div>
              <div className="stat-chip-label">总记录数</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-value quota">{formatQuota(totalQuota)}</div>
              <div className="stat-chip-label">本页额度</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-value cache-r">{totalCacheRead.toLocaleString()}</div>
              <div className="stat-chip-label">读缓存 Tokens</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-value cache-w">{totalCacheWrite.toLocaleString()}</div>
              <div className="stat-chip-label">写缓存 Tokens</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>时间</th>
                    <th>类型</th>
                    <th>模型</th>
                    <th>额度</th>
                    <th>提示</th>
                    <th>补全</th>
                    <th>读缓存</th>
                    <th>写缓存</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id || '-'}</td>
                      <td>{formatTime(log.created_at)}</td>
                      <td><span className={`badge ${TYPE_CLASS[log.type] || ''}`}>{TYPE_MAP[log.type] || log.type}</span></td>
                      <td>{log.model_name || '-'}</td>
                      <td className="quota-cell">{formatQuota(log.quota)}</td>
                      <td className="token-cell">{num(log.prompt_tokens)}</td>
                      <td className="token-cell">{num(log.completion_tokens)}</td>
                      <td className="cache-cell cache-read">{num(log._other?.cache_tokens)}</td>
                      <td className="cache-cell cache-write">{num(log._other?.cache_creation_tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <div className="pagination-left">
              <span className="pagination-label">每页</span>
              <div className="page-size-group">
                {PAGE_SIZES.map(s => (
                  <button key={s} className={`page-size-btn ${pageSize === s ? 'active' : ''}`} onClick={() => handlePageSizeChange(s)}>{s}</button>
                ))}
              </div>
              <span className="pagination-label">条</span>
            </div>
            <div className="pagination-center">
              <button className="page-btn" disabled={currentPage <= 1} onClick={() => query(currentPage - 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {getPageNumbers().map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="page-ellipsis">...</span>
                  : <button key={p} className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => query(p)}>{p}</button>
              )}
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => query(currentPage + 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div className="pagination-right">
              <span className="pagination-info">第 {currentPage}/{totalPages} 页</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
