import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/session";
import { requireEntitledUser } from "@/lib/billing/entitlement";
import { runCompute } from "@/lib/compute/runCompute";
import { HttpError, getErrorMessage } from "@/lib/http";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

type ChatRequest = {
  message: string;
  profileId?: string;
  engineVersion?: string;
  options?: Record<string, unknown>;
};

const computeTool: any = {
  type: "function",
  function: {
    name: "run_compute",
    description: "Run deterministic compute for a profile and return artifact",
    parameters: {
      type: "object",
      properties: {
        profileId: { type: "string" },
        engineVersion: { type: "string" },
        options: { type: "object", additionalProperties: true }
      },
      required: ["profileId", "engineVersion"]
    }
  }
};

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  let userId: string;
  try {
    userId = await requireUserId();
    await requireEntitledUser(userId);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 401;
    return NextResponse.json({ message: getErrorMessage(error, "Unauthorized") }, { status });
  }

  const body = (await req.json()) as ChatRequest;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const userPrompt =
    body.message ||
    `Help me reason about compute runs for profile ${body.profileId ?? "unknown"} with engine ${
      body.engineVersion ?? "latest"
    }.`;

  const stream: any = await openai.responses.stream({
    model,
    input: [
      {
        role: "system",
        content:
          "You are an assistant that helps run deterministic compute for user profiles. Be concise and avoid revealing secrets."
      },
      { role: "user", content: userPrompt }
    ],
    tools: [computeTool],
    tool_choice: "auto"
  });

  stream.on("functionCall", async (event: any) => {
    if (event.name !== "run_compute") return;
    try {
      const args = JSON.parse(event.arguments ?? "{}");
      const profileId = args.profileId ?? body.profileId;
      const engineVersion = args.engineVersion ?? body.engineVersion ?? "1.0.0";
      if (!profileId) {
        throw new HttpError(400, "profileId is required for compute");
      }

      const response = await runCompute({
        userId,
        profileId,
        engineVersion,
        options: args.options ?? body.options ?? {}
      });

      await stream.appendToolOutputs([
        {
          tool_call_id: event.id,
          output: JSON.stringify(response)
        }
      ]);
    } catch (error) {
      await stream.appendToolOutputs([
        {
          tool_call_id: event.id,
          output: JSON.stringify({ error: getErrorMessage(error) })
        }
      ]);
    }
  });

  const readable = stream.toReadableStream();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream"
    }
  });
}
