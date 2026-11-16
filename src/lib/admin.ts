import { hasStaffSession } from "@/lib/auth";

export function reviewAuthorized(request: Request) {
  return hasStaffSession(request);
}
