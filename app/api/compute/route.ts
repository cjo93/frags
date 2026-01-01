import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { requireEntitledUser } from "@/lib/billing/entitlement";
import { runCompute } from "@/lib/compute/runCompute";
import { HttpError, getErrorMessage } from "@/lib/http";

type ComputeRequestBody = {
  profileId: string;
  engineVersion: string;
  engine?: string;
  options?: Record<string, unknown>;
};

export async function POST(request: Request) {
  let computeRunId: string | undefined;

  try {
    const userId = await requireUserId();
    await requireEntitledUser(userId);
    const body = (await request.json()) as ComputeRequestBody;

    if (!body.profileId || !body.engineVersion) {
      return NextResponse.json({ message: "profileId and engineVersion are required" }, { status: 400 });
    }

    const result = await runCompute({
      userId,
      profileId: body.profileId,
      engineVersion: body.engineVersion,
      engine: body.engine,
      options: body.options
    });

    computeRunId = result.computeRunId;
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    return NextResponse.json({ message: getErrorMessage(error, "Unable to process compute") }, { status });
  }
}
