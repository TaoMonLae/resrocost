import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) {
    const membership = await prisma.restaurantMember.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    redirect(membership ? "/dashboard" : "/onboarding");
  }

  return <AuthForm mode="register" />;
}
