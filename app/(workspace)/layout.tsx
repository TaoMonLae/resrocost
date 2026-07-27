import { AppSidebar } from "@/components/layout/app-sidebar";
import { getVerifiedMembership } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await getVerifiedMembership();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        restaurantName={membership.restaurant.name}
        role={membership.role}
        user={{
          name: membership.user.name,
          email: membership.user.email,
          image: membership.user.image,
        }}
      />
      <div className="lg:pl-[248px]">{children}</div>
    </div>
  );
}
