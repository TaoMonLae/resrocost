"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refreshOperationalAlerts } from "@/lib/services/alert-service";
import { requirePermission } from "@/lib/tenant";

export async function refreshAlertsAction() {
  const membership = await requirePermission("reports:read");
  await refreshOperationalAlerts(membership.restaurantId);
  revalidatePath("/dashboard");
}

export async function resolveAlertAction(formData: FormData) {
  const membership = await requirePermission("reports:read");
  const alertId = String(formData.get("alertId") ?? "");
  const alert = await prisma.alert.findFirst({
    where: { id: alertId, restaurantId: membership.restaurantId },
    select: { id: true },
  });
  if (!alert) throw new Error("Alert is unavailable");
  await prisma.alert.update({
    where: { id: alert.id },
    data: { isRead: true, resolvedAt: new Date() },
  });
  revalidatePath("/dashboard");
}
