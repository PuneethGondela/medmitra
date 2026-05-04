import React from 'react';

interface AuditLogsTableProps {
  auditLogs: any[];
  loadingAudit: boolean;
  loadAuditLogs: () => Promise<void>;
}

export default function AuditLogsTable({
  auditLogs,
  loadingAudit,
  loadAuditLogs
}: AuditLogsTableProps) {
  return (
    <section className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6 md:p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          Recent Audit Logs ({auditLogs.length})
        </h2>
        <button
          onClick={loadAuditLogs}
          className="px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl border-2 border-primary-200 transition-all disabled:opacity-50"
          disabled={loadingAudit}
        >
          {loadingAudit ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>
      {loadingAudit ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3"></div>
          <div className="text-slate-700 font-semibold">Loading audit logs...</div>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="text-center py-12 text-slate-600 font-semibold">No audit logs found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Action</th>
                <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Actor</th>
                <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Resource</th>
                <th className="text-left py-3 px-6 text-sm font-bold text-slate-900 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-900">{log.action}</span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-700 font-semibold">
                    {log.actor?.name || log.actor?.email || "Unknown"}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-700 font-semibold">
                    {log.resource_type} <span className="text-xs font-mono text-slate-500 font-semibold">({log.resource_id?.slice(0, 8) || "N/A"})</span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600 font-semibold">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
