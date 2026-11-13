import { db } from '../config/database';
import { Address } from '../types';

export class AddressRepository {
  async findByUserId(userId: string): Promise<Address[]> {
    const res = await db.query<Address>(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId],
    );
    return res.rows;
  }

  async findById(id: string): Promise<Address | null> {
    const res = await db.query<Address>('SELECT * FROM addresses WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async create(userId: string, data: Partial<Address>): Promise<Address> {
    if (data.is_default) {
      await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const res = await db.query<Address>(
      `INSERT INTO addresses (
        user_id, full_name, phone, address_line1, address_line2,
        city, state, postal_code, country, is_default, address_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        data.full_name,
        data.phone,
        data.address_line1,
        data.address_line2 || null,
        data.city,
        data.state,
        data.postal_code,
        data.country || 'India',
        data.is_default || false,
        data.address_type || 'home',
      ],
    );
    return res.rows[0];
  }

  async update(id: string, userId: string, data: Partial<Address>): Promise<Address | null> {
    if (data.is_default) {
      await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'user_id');
    if (keys.length === 0) return this.findById(id);

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map((k) => (data as any)[k]);
    values.push(id, userId);

    const query = `UPDATE addresses SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`;
    const res = await db.query<Address>(query, values);
    return res.rows[0] || null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return (res.rowCount || 0) > 0;
  }

  async setDefault(id: string, userId: string): Promise<Address | null> {
    await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    const res = await db.query<Address>(
      'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId],
    );
    return res.rows[0] || null;
  }
}

export const addressRepository = new AddressRepository();

