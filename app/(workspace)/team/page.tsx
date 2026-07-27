import { Role } from "@prisma/client";
import { Users } from "lucide-react";
import { addTeamMemberAction, updateTeamRoleAction } from "@/app/actions/workspace";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export default async function TeamPage() {
  const membership = await requirePermission("team:manage");
  const members = await prisma.restaurantMember.findMany({
    where: { restaurantId: membership.restaurantId },
    include: { user: { select: { name: true, email: true, createdAt: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return <main className="min-h-screen"><PageHeader description="Assign least-privilege access to registered RestroCost users." eyebrow="Workspace" icon={Users} title="Team" /><div className="mx-auto max-w-[1100px] space-y-6 px-5 py-7 sm:px-8"><section className="grid gap-3 sm:grid-cols-2">{members.map((member) => <Card key={member.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-medium">{member.user.name ?? "Unnamed user"}</h2><p className="mt-1 text-xs text-muted-foreground">{member.user.email}</p></div><Badge variant={member.role === "OWNER" ? "default" : "neutral"}>{member.role.replace("_", " ")}</Badge></div><form action={updateTeamRoleAction} className="mt-5 flex gap-2 border-t pt-4"><input name="memberId" type="hidden" value={member.id} /><Select defaultValue={member.role} name="role">{Object.values(Role).map((role) => <option key={role}>{role}</option>)}</Select><SubmitButton variant="outline">Update</SubmitButton></form></CardContent></Card>)}</section><section className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]"><h2 className="font-medium">Add registered user</h2><p className="mt-1 text-xs text-muted-foreground">The user must create a RestroCost account before being added.</p><form action={addTeamMemberAction} className="mt-5 grid gap-4 sm:grid-cols-[1fr_220px_auto]"><div><Label className="mb-2 block">Email</Label><Input name="email" type="email" required /></div><div><Label className="mb-2 block">Role</Label><Select name="role" defaultValue="VIEWER">{Object.values(Role).map((role) => <option key={role}>{role}</option>)}</Select></div><div className="flex items-end"><SubmitButton>Add member</SubmitButton></div></form></section></div></main>;
}
