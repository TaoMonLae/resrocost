import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Set up your restaurant",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.restaurantMember.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (membership) redirect("/dashboard");

  return <OnboardingWizard userName={session.user.name} />;
}
