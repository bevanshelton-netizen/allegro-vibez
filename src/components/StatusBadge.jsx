export default function StatusBadge({ status = 'draft' }) {
  return <span className={`status-badge status-${String(status).replaceAll('_', '-')}`}>{String(status).replaceAll('_', ' ')}</span>
}
