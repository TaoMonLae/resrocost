"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navigation } from "@/components/layout/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

type SidebarProps = {
  restaurantName: string;
  role: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function AppSidebar(props: SidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r bg-card lg:block">
        <SidebarContent {...props} />
      </aside>
      <MobileSidebar {...props} />
    </>
  );
}

function MobileSidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
      <BrandMark />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Dialog.Root onOpenChange={setOpen} open={open}>
          <Dialog.Trigger asChild>
            <Button aria-label="Open navigation" size="icon" variant="ghost">
              <Menu />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-[70] w-[min(86vw,320px)] border-r bg-card shadow-xl">
              <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  aria-label="Close navigation"
                  className="absolute right-3 top-3 z-10"
                  size="icon"
                  variant="ghost"
                >
                  <X />
                </Button>
              </Dialog.Close>
              <SidebarContent
                {...props}
                onNavigate={() => setOpen(false)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

function SidebarContent({
  restaurantName,
  role,
  user,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <BrandMark />
      </div>

      <div className="mx-3 mb-3">
        <button
          className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left shadow-[var(--shadow)]"
          type="button"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--forest-soft)] text-xs font-semibold text-[var(--forest)]">
            {initials(restaurantName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {restaurantName}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {role.replace("_", " ").toLowerCase()}
            </span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-5" aria-label="Main navigation">
        {navigation.map((group) => (
          <div className="mt-5 first:mt-2" key={group.label}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                const available = item.phase <= 4;

                return (
                  <li key={item.href}>
                    {available ? (
                      <Link
                        className={cn(
                          "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                          active
                            ? "bg-[var(--forest-soft)] font-medium text-[var(--forest)]"
                            : "text-[var(--body)] hover:bg-muted",
                        )}
                        href={item.href}
                        onClick={onNavigate}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground/65"
                        title={`Planned for Phase ${item.phase}`}
                      >
                        <Icon className="size-4" />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[9px]">P{item.phase}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-xs font-medium text-[var(--surface)]">
            {initials(user.name || user.email || "User")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">
              {user.name || "Restaurant owner"}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {user.email}
            </span>
          </span>
          <form action={logoutAction}>
            <Button aria-label="Sign out" size="icon" type="submit" variant="ghost">
              <LogOut />
            </Button>
          </form>
        </div>
        <div className="mt-1 hidden justify-between px-2 lg:flex">
          <Badge variant="neutral">Phase 4</Badge>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
