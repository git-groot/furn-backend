import { PaginatedResult } from '../types';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

export class QueryBuilder {
  private conditions: string[] = [];
  private params: any[] = [];
  private paramIndex = 1;

  public addCondition(sqlSnippet: string, value?: any): this {
    if (value !== undefined && value !== null) {
      // Replace $? placeholder with $1, $2, etc.
      const formattedSnippet = sqlSnippet.includes('$?')
        ? sqlSnippet.replace(/\$\?/g, `$${this.paramIndex++}`)
        : sqlSnippet;
      this.conditions.push(formattedSnippet);
      this.params.push(value);
    } else {
      this.conditions.push(sqlSnippet);
    }
    return this;
  }

  public getWhereClause(prefix = 'WHERE'): string {
    if (this.conditions.length === 0) return '';
    return `${prefix} ${this.conditions.join(' AND ')}`;
  }

  public getParams(): any[] {
    return this.params;
  }

  public static getPagination(query: PaginationParams, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(maxLimit, Number(query.limit) || defaultLimit));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  public static buildSortClause(
    requestedSort?: string,
    requestedOrder?: string,
    allowedSortColumns: Record<string, string> = { created_at: 'created_at' },
    defaultSortKey = 'created_at',
  ): string {
    const sortKey = requestedSort && allowedSortColumns[requestedSort] ? requestedSort : defaultSortKey;
    const dbColumn = allowedSortColumns[sortKey] || allowedSortColumns[defaultSortKey] || 'created_at';
    const direction = requestedOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return `ORDER BY ${dbColumn} ${direction}`;
  }

  public static formatPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}

