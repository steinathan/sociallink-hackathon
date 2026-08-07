import { NextRequest, NextResponse } from "next/server";
import { getWalletNonce } from "@/actions/auth-wallet.actions";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { address?: string }
      | null;
    const address = typeof body?.address === "string" ? body.address : "";

    if (!ADDRESS_REGEX.test(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address." },
        { status: 400 }
      );
    }

    const result = await getWalletNonce(address);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not issue nonce." },
      { status: 500 }
    );
  }
}