/**
 * Base Repository
 * Provides common CRUD operations using Knex
 * All repositories should extend this class
 */

import knex, { Knex } from '../knex';

export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export abstract class BaseRepository<T extends object> {
  protected tableName: string;
  protected primaryKey: string;

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Get the Knex query builder for this table
   */
  protected query(): Knex.Knex.QueryBuilder {
    return knex(this.tableName);
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(
    conditions?: Partial<T>,
    options?: QueryOptions
  ): Promise<T[]> {
    let query = this.query();

    if (conditions) {
      query = query.where(conditions);
    }

    if (options?.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query as Promise<T[]>;
  }

  /**
   * Find records with pagination
   */
  async findPaginated(
    conditions?: Partial<T>,
    pagination?: PaginationOptions,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Get total count
    let countQuery = this.query();
    if (conditions) {
      countQuery = countQuery.where(conditions);
    }
    const [{ count }] = await countQuery.count('* as count');
    const totalItems = Number(count);

    // Get paginated data
    const data = await this.findAll(conditions, {
      ...options,
      limit: pageSize,
      offset
    });

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  /**
   * Find a single record by primary key
   */
  async findById(id: string | number): Promise<T | undefined> {
    return this.query()
      .where({ [this.primaryKey]: id })
      .first() as Promise<T | undefined>;
  }

  /**
   * Find a single record by conditions
   */
  async findOne(conditions: Partial<T>): Promise<T | undefined> {
    return this.query()
      .where(conditions)
      .first() as Promise<T | undefined>;
  }

  /**
   * Check if a record exists
   */
  async exists(conditions: Partial<T>): Promise<boolean> {
    const result = await this.query()
      .where(conditions)
      .first();
    return !!result;
  }

  /**
   * Count records matching conditions
   */
  async count(conditions?: Partial<T>): Promise<number> {
    let query = this.query();
    if (conditions) {
      query = query.where(conditions);
    }
    const [{ count }] = await query.count('* as count');
    return Number(count);
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const [id] = await this.query().insert(data);

    // For SQLite, we need to fetch the record after insert
    // For PostgreSQL, we could use returning()
    if (this.primaryKey === 'id' && typeof id === 'number') {
      return this.findById(id) as Promise<T>;
    }

    // If primary key is in data, use it to fetch
    const pkValue = data[this.primaryKey as keyof typeof data];
    if (pkValue) {
      return this.findById(pkValue as string | number) as Promise<T>;
    }

    return data as T;
  }

  /**
   * Create multiple records
   */
  async createMany(data: Partial<T>[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await this.query().insert(data);
    return Array.isArray(result) ? result.length : 1;
  }

  /**
   * Update a record by primary key
   */
  async update(id: string | number, data: Partial<T>): Promise<T | undefined> {
    await this.query()
      .where({ [this.primaryKey]: id })
      .update(data);

    return this.findById(id);
  }

  /**
   * Update records matching conditions
   */
  async updateWhere(conditions: Partial<T>, data: Partial<T>): Promise<number> {
    return this.query()
      .where(conditions)
      .update(data);
  }

  /**
   * Delete a record by primary key
   */
  async delete(id: string | number): Promise<number> {
    return this.query()
      .where({ [this.primaryKey]: id })
      .del();
  }

  /**
   * Delete records matching conditions
   */
  async deleteWhere(conditions: Partial<T>): Promise<number> {
    return this.query()
      .where(conditions)
      .del();
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<R>(
    callback: (trx: Knex.Knex.Transaction) => Promise<R>
  ): Promise<R> {
    return knex.transaction(callback);
  }

  /**
   * Raw query execution
   */
  async raw<R = unknown>(sql: string, bindings?: readonly Knex.Knex.RawBinding[]): Promise<R> {
    const result = await knex.raw(sql, bindings as Knex.Knex.RawBinding[]);
    return result as R;
  }
}
