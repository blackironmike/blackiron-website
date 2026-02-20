import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Map Stripe product metadata "tier" to our tier values
function getTierFromSession(session: Stripe.Checkout.Session): string | null {
  const metadata = session.metadata;
  if (metadata?.tier) return metadata.tier;
  return null;
}

async function getTierFromLineItems(sessionId: string): Promise<string | null> {
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
    expand: ["data.price.product"],
  });
  for (const item of lineItems.data) {
    const product = item.price?.product as Stripe.Product;
    if (product?.metadata?.tier) {
      return product.metadata.tier;
    }
  }
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email || session.customer_email;
  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  // Determine tier from session metadata or line items
  let tier = getTierFromSession(session);
  if (!tier) {
    tier = await getTierFromLineItems(session.id);
  }
  if (!tier) {
    console.error("No tier found for session:", session.id);
    return;
  }

  // Try to find existing Supabase user by email
  let userId: string | null = null;
  if (customerEmail) {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const match = users?.users?.find(
      (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );
    if (match) userId = match.id;
  }

  if (tier === "coaching_call") {
    // One-time coaching call purchase
    await supabaseAdmin.from("coaching_calls").insert({
      user_id: userId,
      customer_email: customerEmail,
      stripe_payment_intent_id: session.payment_intent as string,
      status: "purchased",
    });
  } else {
    // Subscription purchase (blueprint or full_coaching)
    const stripeSubscriptionId = session.subscription as string;

    let currentPeriodEnd: string | null = null;
    if (stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
    }

    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      customer_email: customerEmail,
      tier: tier,
      status: "active",
      current_period_end: currentPeriodEnd,
    });

    // Update profiles with stripe_customer_id if user exists
    if (userId && stripeCustomerId) {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", userId);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = subscription.cancel_at_period_end
    ? "active" // still active until period ends
    : subscription.status === "active"
    ? "active"
    : subscription.status === "past_due"
    ? "past_due"
    : "canceled";

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: status,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) return;

  // Retrieve the subscription to get fresh period end
  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return new Response(`Handler error: ${(err as Error).message}`, {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
