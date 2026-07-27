"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type AuthActionState = {
  error?: string;
};

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[a-z]/, "Use at least one lowercase letter")
    .regex(/[A-Z]/, "Use at least one uppercase letter")
    .regex(/[0-9]/, "Use at least one number"),
});

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }
  const loginLimit = checkRateLimit(`login:${parsed.data.email}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!loginLimit.allowed) {
    return {
      error: "Too many sign-in attempts. Please try again later.",
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email or password is incorrect." };
    }
    throw error;
  }

  return {};
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check your details and try again.",
    };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return { error: "An account already exists for this email." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "An account already exists for this email." };
    }
    console.error("Account registration failed", error);
    return {
      error:
        "We could not create your account right now. Please try again in a moment.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return {
        error: "Your account was created. Please sign in to continue.",
      };
    }
    console.error("Automatic sign-in after registration failed", error);
    return {
      error: "Your account was created. Please sign in to continue.",
    };
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}
