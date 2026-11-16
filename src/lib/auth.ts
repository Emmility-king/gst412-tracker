import { createHmac, timingSafeEqual } from "crypto";
import { normalizeMatric } from "@/lib/payment";

const STAFF_COOKIE = "gst412_staff_session";
const STUDENT_COOKIE = "gst412_student_session";
const SESSION_SECONDS = 8 * 60 * 60;

type StaffPayload = { role: "staff"; exp: number };
export type StudentProfile = { fullName: string; matricNumber: string };
type StudentPayload = StudentProfile & { role: "student"; exp: number };

function sessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.PAYMENT_REVIEW_PASSWORD || "";
}

function signature(value: string) {
  const secret = sessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function makeToken(payload: StaffPayload | StudentPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

function readToken<T>(request: Request, cookieName: string): T | null {
  const token = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token || !sessionSecret()) return null;
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T & { exp?: number };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload as T;
  } catch {
    return null;
  }
}

function cookieOptions(request: Request) {
  const secure = process.env.NODE_ENV === "production" || request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  return `HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function makeStaffSessionCookie(request: Request) {
  const token = makeToken({ role: "staff", exp: Date.now() + SESSION_SECONDS * 1000 });
  return `${STAFF_COOKIE}=${token}; ${cookieOptions(request)}`;
}

export function makeStudentSessionCookie(request: Request, profile: StudentProfile) {
  const token = makeToken({ ...profile, role: "student", exp: Date.now() + SESSION_SECONDS * 1000 });
  return `${STUDENT_COOKIE}=${token}; ${cookieOptions(request)}`;
}

export function clearSessionCookie(request: Request, role: "staff" | "student") {
  const cookieName = role === "staff" ? STAFF_COOKIE : STUDENT_COOKIE;
  const secure = process.env.NODE_ENV === "production" || request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  return `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function verifyStaffPassword(provided: string) {
  const expected = process.env.PAYMENT_REVIEW_PASSWORD;
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(provided);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function hasStaffSession(request: Request) {
  const session = readToken<StaffPayload>(request, STAFF_COOKIE);
  return session?.role === "staff";
}

export function getStudentProfile(request: Request): StudentProfile | null {
  const session = readToken<StudentPayload>(request, STUDENT_COOKIE);
  if (session?.role !== "student" || !session.fullName || !session.matricNumber) return null;
  return { fullName: session.fullName, matricNumber: normalizeMatric(session.matricNumber) };
}

export function isValidStudentCredentials(fullName: string, matricNumber: string) {
  return fullName.trim().replace(/\s+/g, " ").length >= 3 && /^[A-Z]{3}\d{5}$/.test(normalizeMatric(matricNumber));
}
