import "server-only";

import { redirect } from "next/navigation";
import type { Permission } from "@/lib/permissions";
import { assertPermission } from "@/lib/permissions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getVerifiedMembership(restaurantId?: string) {
  const user = await requireUser();

  const membership = await prisma.restaurantMember.findFirst({
    where: {
      userId: user.id,
      ...(restaurantId ? { restaurantId } : {}),
      restaurant: { deletedAt: null },
    },
    include: {
      restaurant: true,
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) redirect("/onboarding");
  return membership;
}

export async function requirePermission(
  permission: Permission,
  restaurantId?: string,
) {
  const membership = await getVerifiedMembership(restaurantId);
  assertPermission(membership.role, permission);
  return membership;
}
