export const TYPE_MAP = { 1: '充值', 2: '消费', 3: '管理', 4: '错误', 5: '系统' };
export const TYPE_CLASS = { 1: 'badge-topup', 2: 'badge-consume', 3: 'badge-manage', 4: 'badge-error', 5: 'badge-system' };

export function formatTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts * 1000);
  return d.toLocaleString('zh-CN', { hour12: false });
}

export function formatQuota(q) {
  if (q === undefined || q === null) return '-';
  const dollars = q / 500000;
  if (dollars < 0.01 && dollars > 0) return '$' + dollars.toFixed(6);
  return '$' + dollars.toFixed(4);
}
