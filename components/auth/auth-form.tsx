"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import {
  loginAction,
  registerAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const action = isLogin ? loginAction : registerAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <main className="min-h-screen bg-card lg:grid lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[var(--forest)] p-10 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.08] fine-grid" />
        <div className="relative">
          <BrandMark className="[&_span:first-child]:bg-white [&_span:first-child]:text-[var(--forest)]" />
        </div>

        <div className="relative max-w-xl py-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
            <ShieldCheck className="size-3.5" />
            Built for margin-conscious teams
          </span>
          <h1 className="max-w-lg text-4xl font-normal leading-[1.08] tracking-[-0.04em] xl:text-5xl">
            Know what every plate really costs.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-6 text-white/68">
            Track ingredient prices, protect margins, and make confident menu
            decisions from one clear operating view.
          </p>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
            {[
              "Recipe costs that update with purchases",
              "Role-based access for your whole team",
              "Branch-level inventory and performance",
              "Historical profit that never rewrites itself",
            ].map((benefit) => (
              <div
                className="flex gap-2.5 rounded-lg border border-white/12 bg-white/[0.06] p-3 text-sm text-white/84"
                key={benefit}
              >
                <Check className="mt-0.5 size-4 shrink-0 text-[#a8d8c4]" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-end justify-between border-t border-white/14 pt-5 text-xs text-white/55">
          <span>Restaurant cost & profit management</span>
          <span>Production-ready · Six phases complete</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-card px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <BrandMark className="mb-12 lg:hidden" />

          <div className="mb-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {isLogin ? "Welcome back" : "Start with the essentials"}
            </p>
            <h2 className="text-3xl font-normal tracking-[-0.035em]">
              {isLogin ? "Sign in to your workspace" : "Create your account"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isLogin
                ? "Enter the details associated with your restaurant."
                : "You’ll set up your first restaurant and branch next."}
            </p>
          </div>

          <form action={formAction} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  autoComplete="name"
                  id="name"
                  name="name"
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                autoCapitalize="none"
                autoComplete="email"
                id="email"
                name="email"
                placeholder="owner@restaurant.com"
                required
                type="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <span className="text-xs text-muted-foreground">
                    Minimum 8 characters
                  </span>
                )}
              </div>
              <Input
                autoComplete={isLogin ? "current-password" : "new-password"}
                id="password"
                minLength={isLogin ? 8 : 10}
                name="password"
                required
                type="password"
              />
              {!isLogin && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Use 10+ characters with uppercase, lowercase, and a number.
                </p>
              )}
            </div>

            {state.error && (
              <div
                aria-live="polite"
                className="rounded-lg border border-[var(--coral)]/25 bg-[var(--coral-soft)] px-3.5 py-3 text-sm text-[var(--coral)]"
                role="alert"
              >
                {state.error}
              </div>
            )}

            <SubmitButton
              className="w-full"
              pendingLabel={isLogin ? "Signing in…" : "Creating account…"}
              size="lg"
            >
              {isLogin ? "Sign in" : "Create account"}
              <ArrowRight aria-hidden="true" />
            </SubmitButton>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {isLogin ? "New to RestroCost?" : "Already have an account?"}{" "}
            <Link
              className="font-medium text-foreground underline decoration-border underline-offset-4"
              href={isLogin ? "/register" : "/login"}
            >
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
