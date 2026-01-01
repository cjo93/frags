import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { HttpError } from "@/lib/http";

export async function requireUserIdOrRedirect() {
  try {
    return await requireUserId();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect("/api/auth/signin");
    }
    throw error;
  }
}
