import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    // Razorpay requires amount in smallest currency unit (e.g., pence for GBP, paise for INR)
    // The frontend sends amount in whole units (e.g., £25.50 -> 25.50)
    // We multiply by 100 to convert to pence.
    const amountInSmallestUnit = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInSmallestUnit,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("Razorpay Error:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
