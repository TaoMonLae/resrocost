"use server";

import { AuditAction, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

const memberSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  role: z.nativeEnum(Role),
});

export async function addTeamMemberAction(formData: FormData) {
  const membership = await requirePermission("team:manage");
  const data = memberSchema.parse(Object.fromEntries(formData));
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new Error("That person must register before they can be added");
  }
  const member = await prisma.restaurantMember.upsert({
    where: {
      restaurantId_userId: {
        restaurantId: membership.restaurantId,
        userId: user.id,
      },
    },
    update: { role: data.role },
    create: {
      restaurantId: membership.restaurantId,
      userId: user.id,
      role: data.role,
    },
  });
  await prisma.auditLog.create({
    data: {
      restaurantId: membership.restaurantId,
      userId: membership.userId,
      action: AuditAction.ROLE_CHANGE,
      entityType: "RestaurantMember",
      entityId: member.id,
      newValues: { email: data.email, role: data.role },
    },
  });
  revalidatePath("/team");
}

export async function updateTeamRoleAction(formData: FormData) {
  const membership = await requirePermission("team:manage");
  const memberId = z.string().min(1).parse(formData.get("memberId"));
  const role = z.nativeEnum(Role).parse(formData.get("role"));
  const target = await prisma.restaurantMember.findFirst({
    where: { id: memberId, restaurantId: membership.restaurantId },
  });
  if (!target) throw new Error("Team member is unavailable");
  if (target.userId === membership.userId && role !== Role.OWNER) {
    throw new Error("You cannot remove your own owner access");
  }
  if (target.role === Role.OWNER && role !== Role.OWNER) {
    const owners = await prisma.restaurantMember.count({
      where: { restaurantId: membership.restaurantId, role: Role.OWNER },
    });
    if (owners <= 1) throw new Error("A restaurant must have at least one owner");
  }
  await prisma.$transaction([
    prisma.restaurantMember.update({ where: { id: target.id }, data: { role } }),
    prisma.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.ROLE_CHANGE,
        entityType: "RestaurantMember",
        entityId: target.id,
        oldValues: { role: target.role },
        newValues: { role },
      },
    }),
  ]);
  revalidatePath("/team");
}

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(2).max(80),
  taxRate: z.coerce.number().min(0).max(100),
  defaultFoodCostPercent: z.coerce.number().positive().lt(100),
  defaultProfitMargin: z.coerce.number().min(0).lt(100),
  monthlyFixedExpenses: z.coerce.number().min(0),
  pricesIncludeTax: z.string().optional(),
  allowNegativeStock: z.string().optional(),
});

export async function updateRestaurantSettingsAction(formData: FormData) {
  const membership = await requirePermission("restaurant:manage");
  const data = settingsSchema.parse(Object.fromEntries(formData));
  const old = membership.restaurant;
  const updated = await prisma.restaurant.update({
    where: { id: membership.restaurantId },
    data: {
      name: data.name,
      currency: data.currency,
      country: data.country,
      timezone: data.timezone,
      taxRate: data.taxRate,
      pricesIncludeTax: Boolean(data.pricesIncludeTax),
      defaultFoodCostPercent: data.defaultFoodCostPercent,
      defaultProfitMargin: data.defaultProfitMargin,
      monthlyFixedExpenses: data.monthlyFixedExpenses,
      allowNegativeStock: Boolean(data.allowNegativeStock),
    },
  });
  await prisma.auditLog.create({
    data: {
      restaurantId: membership.restaurantId,
      userId: membership.userId,
      action: AuditAction.SETTINGS_CHANGE,
      entityType: "Restaurant",
      entityId: updated.id,
      oldValues: {
        name: old.name,
        currency: old.currency,
        taxRate: old.taxRate.toString(),
        allowNegativeStock: old.allowNegativeStock,
      },
      newValues: {
        name: updated.name,
        currency: updated.currency,
        taxRate: updated.taxRate.toString(),
        allowNegativeStock: updated.allowNegativeStock,
      },
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(2).max(80),
});

export async function createBranchAction(formData: FormData) {
  const membership = await requirePermission("restaurant:manage");
  const data = branchSchema.parse(Object.fromEntries(formData));
  const branch = await prisma.branch.create({
    data: { restaurantId: membership.restaurantId, ...data },
  });
  await prisma.auditLog.create({
    data: {
      restaurantId: membership.restaurantId,
      userId: membership.userId,
      action: AuditAction.CREATE,
      entityType: "Branch",
      entityId: branch.id,
      newValues: { name: branch.name, code: branch.code },
    },
  });
  revalidatePath("/settings");
}
