export async function GET() {
  return Response.json({
    status: "ok",
    service: "mandatelab",
    mode: process.env.NEXT_PUBLIC_MANDATE_EXECUTOR_ADDRESS
      ? "monad-testnet"
      : "local-proof",
  });
}
