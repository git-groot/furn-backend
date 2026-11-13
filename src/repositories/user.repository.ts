import { db } from '../config/database';
import { AdminUserFilterQuery, PaginatedResult, User, UserRole, UserWithoutPassword } from '../types';
import { QueryBuilder } from '../utils/queryBuilder';

export const toUserResponse = (user: User): UserWithoutPassword => {
  const { password_hash: _, ...rest } = user;
  return rest;
};

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const res = await db.query<User>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()],
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const res = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async countActiveAdmins(excludeUserId?: string): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND deleted_at IS NULL`;
    const params: any[] = [];
    if (excludeUserId) {
      sql += ` AND id != $1`;
      params.push(excludeUserId);
    }
    const res = await db.query<{ count: string }>(sql, params);
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  async findAdminUsers(query: AdminUserFilterQuery): Promise<PaginatedResult<UserWithoutPassword>> {
    const { page, limit, offset } = QueryBuilder.getPagination(query);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Status filtering
    if (query.status === 'active') {
      conditions.push('u.is_active = true AND u.deleted_at IS NULL');
    } else if (query.status === 'inactive') {
      conditions.push('u.is_active = false AND u.deleted_at IS NULL');
    } else if (query.status === 'deleted') {
      conditions.push('u.deleted_at IS NOT NULL');
    } else if (query.status === 'all') {
      // Include all
    } else {
      conditions.push('u.deleted_at IS NULL');
    }

    if (query.role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(query.role);
      paramIndex++;
    }

    if (query.search) {
      conditions.push(
        `(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`,
      );
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumns: Record<string, string> = {
      name: 'u.first_name',
      email: 'u.email',
      role: 'u.role',
      created_at: 'u.created_at',
    };
    const sortClause = QueryBuilder.buildSortClause(query.sort, query.order, sortColumns, 'created_at');

    const countSql = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
    const countRes = await db.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT u.*
      FROM users u
      ${whereClause}
      ${sortClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataRes = await db.query<User>(dataSql, [...params, limit, offset]);
    const safeData = dataRes.rows.map(toUserResponse);

    return QueryBuilder.formatPaginatedResult(safeData, total, page, limit);
  }

  async create(data: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    role?: UserRole;
    is_active?: boolean;
  }): Promise<User> {
    const res = await db.query<User>(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.email.toLowerCase().trim(),
        data.password_hash,
        data.first_name.trim(),
        data.last_name.trim(),
        data.phone || null,
        data.role || 'customer',
        data.is_active ?? true,
      ],
    );
    return res.rows[0];
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.first_name !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(data.first_name.trim());
    }
    if (data.last_name !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(data.last_name.trim());
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone || null);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(data.role);
      // Invalidate refresh tokens on role change
      fields.push(`token_version = token_version + 1`);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.is_active);
      if (!data.is_active) {
        fields.push(`token_version = token_version + 1`);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`;
    const res = await db.query<User>(query, values);
    return res.rows[0] || null;
  }

  async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const res = await db.query<User>(
      `UPDATE users 
       SET is_active = $1, 
           token_version = CASE WHEN $1 = false THEN token_version + 1 ELSE token_version END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING *`,
      [isActive, id],
    );
    return res.rows[0] || null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<User | null> {
    const res = await db.query<User>(
      `UPDATE users 
       SET password_hash = $1, 
           token_version = token_version + 1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND deleted_at IS NULL 
       RETURNING *`,
      [passwordHash, id],
    );
    return res.rows[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const res = await db.query(
      `UPDATE users 
       SET deleted_at = CURRENT_TIMESTAMP, 
           is_active = false, 
           token_version = token_version + 1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND deleted_at IS NULL 
       RETURNING id`,
      [id],
    );
    return (res.rowCount || 0) > 0;
  }
}

export const userRepository = new UserRepository();
