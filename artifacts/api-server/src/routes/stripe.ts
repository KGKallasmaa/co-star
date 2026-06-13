import { Router, type IRouter } from 'express';
import { stripeStorage } from '../stripeStorage.js';
import { getUncachableStripeClient } from '../stripeClient.js';
import { logger } from '../lib/logger.js';

const router: IRouter = Router();

function getAppBaseUrl(req: any): string {
  const domains = process.env.REPLIT_DOMAINS?.split(',')[0];
  if (domains) return `https://${domains}`;
  return `${req.protocol}://${req.get('host')}`;
}

// Check subscription status for a device
router.get('/stripe/subscription', async (req, res) => {
  const deviceId = req.query.deviceId as string;
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId required' });
    return;
  }

  try {
    const user = await stripeStorage.getUser(deviceId);
    if (!user?.stripe_subscription_id) {
      res.json({ active: false, subscription: null });
      return;
    }

    const sub = await stripeStorage.getSubscriptionStatus(user.stripe_subscription_id);
    const active = sub?.status === 'active' || sub?.status === 'trialing';
    res.json({ active, subscription: sub });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get subscription status');
    res.status(500).json({ error: 'Failed to check subscription' });
  }
});

// Create Stripe Checkout Session
router.post('/stripe/checkout', async (req, res) => {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId required' });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const user = await stripeStorage.upsertUser(deviceId);
    const baseUrl = getAppBaseUrl(req);

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { deviceId },
      });
      await stripeStorage.updateStripeInfo(deviceId, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    // Get active prices
    const prices = await stripeStorage.getActivePrices();
    const priceId = prices[0]?.id;

    if (!priceId) {
      res.status(500).json({ error: 'No active subscription price found. Run seed-products first.' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&deviceId=${deviceId}`,
      cancel_url: `${baseUrl}/api/stripe/cancel`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, 'Failed to create checkout session');
    res.status(500).json({ error: 'Failed to create checkout session: ' + err.message });
  }
});

// Success redirect (records subscription, shows a simple page)
router.get('/stripe/success', async (req, res) => {
  const { session_id, deviceId } = req.query as { session_id?: string; deviceId?: string };

  if (session_id && deviceId) {
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.subscription) {
        await stripeStorage.updateStripeInfo(deviceId, {
          stripeSubscriptionId: session.subscription as string,
        });
      }
    } catch (err: any) {
      logger.error({ err }, 'Failed to record subscription after checkout');
    }
  }

  res.send(`<!DOCTYPE html>
<html style="background:#04111f;font-family:Georgia,serif;color:#e8e0d4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<body style="text-align:center">
  <div>
    <div style="font-size:36px;margin-bottom:16px">✦</div>
    <h2 style="font-weight:400;font-size:22px;margin-bottom:8px">You're in.</h2>
    <p style="color:#7a8a9a;font-size:15px">Return to the app to start talking with your advisors.</p>
  </div>
</body>
</html>`);
});

// Cancel redirect
router.get('/stripe/cancel', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html style="background:#04111f;font-family:Georgia,serif;color:#e8e0d4;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<body style="text-align:center">
  <div>
    <div style="font-size:36px;margin-bottom:16px">✦</div>
    <h2 style="font-weight:400;font-size:22px;margin-bottom:8px">No problem.</h2>
    <p style="color:#7a8a9a;font-size:15px">Return to the app whenever you're ready.</p>
  </div>
</body>
</html>`);
});

export default router;
