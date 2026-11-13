import { db } from '../config/database';
import { AdminAuditLog } from '../types';

export class AuditLogRepository {
  async log(data: {
    admin_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    metadata?: any;
  }): Promise<AdminAuditLog> {
    const res = await db.query<AdminAuditLog>(
      `INSERT INTO admin_audit_logs (admin_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.admin_id,
        data.action,
        data.resource_type,
        data.resource_id,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    );
    return res.rows[0];
  }

  async findRecent(limit = 50): Promise<AdminAuditLog[]> {
    const res = await db.query<AdminAuditLog>(
      `SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return res.rows;
  }
}

export const auditLogRepository = new AuditLogRepository();

