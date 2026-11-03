export const fmt = (n) => Math.round(n).toLocaleString('en-IN')
export const f1 = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
export const f2 = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
export const sevVar = (s) => 'var(--' + ({ Critical: 'crit', High: 'high', Medium: 'med', Low: 'low' }[s] || 'low') + ')'
