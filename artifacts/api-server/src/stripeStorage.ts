import pg from 'pg';

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

function getPool() {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export interface User {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export const stripeStorage = {
  async getUser(deviceId: string): Promise<User | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [deviceId]);
    return result.rows[0] ?? null;
  },

  async upsertUser(deviceId: string): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (id) VALUES ($1)
       ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
       RETURNING *`,
      [deviceId]
    );
    return result.rows[0];
  },

  async updateStripeInfo(deviceId: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void> {
    const pool = getPool();
    if (info.stripeCustomerId) {
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [info.stripeCustomerId, deviceId]);
    }
    if (info.stripeSubscriptionId) {
      await pool.query('UPDATE users SET stripe_subscription_id = $1 WHERE id = $2', [info.stripeSubscriptionId, deviceId]);
    }
  },

  async getSubscriptionStatus(subscriptionId: string): Promise<{ status: string; currentPeriodEnd: number | null } | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT status, current_period_end FROM stripe.subscriptions WHERE id = $1`,
      [subscriptionId]
    );
    if (!result.rows[0]) return null;
    return {
      status: result.rows[0].status,
      currentPeriodEnd: result.rows[0].current_period_end,
    };
  },

  async getActivePrices(): Promise<Array<{ id: string; unit_amount: number; currency: string; recurring: unknown }>> {
    const pool = getPool();
    try {
      const result = await pool.query(
        `SELECT pr.id, pr.unit_amount, pr.currency, pr.recurring
         FROM stripe.prices pr
         JOIN stripe.products p ON p.id = pr.product
         WHERE pr.active = true AND p.active = true
         ORDER BY pr.unit_amount ASC`
      );
      return result.rows;
    } catch {
      return [];
    }
  },
};
