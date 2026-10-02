"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface LogRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.logs ?? []));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gate-text">Audit logs</h1>
      <div className="overflow-x-auto rounded-xl border border-gate-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gate-surface text-gate-textMuted">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gate-border hover:bg-gate-surface">
                <td className="px-4 py-3 text-gate-text">{log.action}</td>
                <td className="px-4 py-3 text-gate-textMuted">{log.entity}</td>
                <td className="px-4 py-3 text-gate-textMuted">{log.user?.name ?? "System"}</td>
                <td className="px-4 py-3 text-gate-textMuted">{format(new Date(log.createdAt), "Pp")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
