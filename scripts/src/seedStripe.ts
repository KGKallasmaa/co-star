import Stripe from 'stripe';

async function getStripeCredentials(): Promise<{ secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Missing Replit environment variables. Connect Stripe via the Integrations tab.');
  }

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!resp.ok) throw new Error(`Failed to fetch Stripe credentials: ${resp.status}`);

  const data = await resp.json() as { items?: Array<{ settings?: { secret_key?: string } }> };
  const secretKey = data.items?.[0]?.settings?.secret_key;
  if (!secretKey) throw new Error('Stripe integration not connected.');

  return { secretKey };
}

async function seedProducts() {
  const { secretKey } = await getStripeCredentials();
  const stripe = new Stripe(secretKey);

  console.log('Checking for existing Co-Star for Founders plan...');

  const existing = await stripe.products.search({
    query: "name:'Co-Star for Founders' AND active:'true'"
  });

  if (existing.data.length > 0) {
    const product = existing.data[0]!;
    console.log(`✓ Product already exists: ${product.id}`);
    const prices = await stripe.prices.list({ product: product.id, active: true });
    prices.data.forEach(p => {
      console.log(`  Price: ${p.id} — $${(p.unit_amount ?? 0) / 100}/${(p.recurring as any)?.interval}`);
    });
    return;
  }

  console.log('Creating Co-Star for Founders product...');

  const product = await stripe.products.create({
    name: 'Co-Star for Founders',
    description: 'Six AI advisors who actually get it. No bullet points. No unsolicited advice.',
    metadata: { app: 'costar-founders' },
  });

  console.log(`✓ Created product: ${product.id}`);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 1000,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'monthly' },
  });

  console.log(`✓ Created monthly price: $10.00/month — ${monthlyPrice.id}`);

  console.log('\nDone. Webhooks will sync this data to your database.');
  console.log('Restart the API server to pick up the new prices.');
}

seedProducts().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
