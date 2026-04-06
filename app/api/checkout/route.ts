import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Remove watermark (Invoice PDF)",
            },
            unit_amount: 500, // $5
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}?canceled=true`,
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}