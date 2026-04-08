export function formatNumber(num: number): string {
  return num.toLocaleString('ko-KR');
}

export function formatExp(current: number, total: number): string {
  return `${formatNumber(current)} / ${formatNumber(total)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatGold(gold: number): string {
  if (gold >= 10000) {
    return `${(gold / 10000).toFixed(1)}만 G`;
  }
  return `${formatNumber(gold)} G`;
}
