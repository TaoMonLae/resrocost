"use client";

import { useActionState, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChefHat,
  Coins,
  MapPin,
  PackagePlus,
  ReceiptText,
  SlidersHorizontal,
  Utensils,
} from "lucide-react";
import {
  completeOnboarding,
  type OnboardingState,
} from "@/app/actions/onboarding";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: OnboardingState = {};

const steps = [
  { title: "Restaurant", detail: "Name & currency", icon: Building2 },
  { title: "Tax setup", detail: "Country & display", icon: ReceiptText },
  { title: "Targets", detail: "Food cost & margin", icon: SlidersHorizontal },
  { title: "Fixed costs", detail: "Monthly baseline", icon: Coins },
  { title: "First branch", detail: "Operating location", icon: MapPin },
  { title: "Ingredient", detail: "Optional starter", icon: PackagePlus },
  { title: "Recipe", detail: "Optional starter", icon: ChefHat },
  { title: "Menu item", detail: "Optional starter", icon: Utensils },
] as const;

const selectClass =
  "h-11 w-full rounded-md border bg-card px-3 text-sm text-foreground shadow-[var(--shadow)]";

export function OnboardingWizard({ userName }: { userName?: string | null }) {
  const [step, setStep] = useState(0);
  const [state, formAction] = useActionState(completeOnboarding, initialState);
  const isLastStep = step === steps.length - 1;

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="hidden border-r bg-card p-6 lg:flex lg:flex-col">
        <BrandMark />
        <div className="mt-12">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Workspace setup
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}. We’ll turn
            your cost targets into a working restaurant workspace.
          </p>
        </div>

        <ol className="mt-8 space-y-1" aria-label="Onboarding progress">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const complete = index < step;
            const active = index === step;

            return (
              <li key={item.title}>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    active && "bg-[var(--forest-soft)]",
                    !active && "text-muted-foreground",
                  )}
                  onClick={() => index <= step && setStep(index)}
                  type="button"
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md border bg-card",
                      active &&
                        "border-[var(--forest)] bg-[var(--forest)] text-white dark:text-[#111]",
                      complete &&
                        "border-[var(--forest)] text-[var(--forest)]",
                    )}
                  >
                    {complete ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span>
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        active && "text-foreground",
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="block text-xs">{item.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-auto rounded-lg bg-[var(--surface-soft)] p-4">
          <p className="text-xs font-medium">Safe to refine later</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Every target and branch setting can be changed after setup.
          </p>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-5 sm:px-8 lg:px-12">
          <BrandMark className="lg:hidden" />
          <div className="hidden lg:block">
            <p className="text-sm font-medium">{steps[step].title}</p>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {steps.length}
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {Math.round(((step + 1) / steps.length) * 100)}% complete
          </span>
        </header>

        <div className="h-1 bg-muted lg:hidden">
          <div
            className="h-full bg-[var(--forest)] transition-[width]"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 items-start justify-center px-5 py-10 sm:px-8 sm:py-14">
            <div className="w-full max-w-[620px]">
              <div hidden={step !== 0}>
                <StepHeading
                  eyebrow="The foundation"
                  title="Tell us about your restaurant."
                  description="This creates your tenant workspace and controls how money is displayed across every report."
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field className="sm:col-span-2" label="Restaurant name">
                    <Input
                      autoFocus
                      name="restaurantName"
                      placeholder="Ember & Grain"
                      required
                    />
                  </Field>
                  <Field label="Currency">
                    <select className={selectClass} defaultValue="MYR" name="currency">
                      <option value="MYR">MYR · Malaysian Ringgit</option>
                      <option value="USD">USD · US Dollar</option>
                      <option value="SGD">SGD · Singapore Dollar</option>
                      <option value="THB">THB · Thai Baht</option>
                      <option value="IDR">IDR · Indonesian Rupiah</option>
                      <option value="EUR">EUR · Euro</option>
                      <option value="GBP">GBP · British Pound</option>
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <select
                      className={selectClass}
                      defaultValue="Asia/Kuala_Lumpur"
                      name="timezone"
                    >
                      <option value="Asia/Kuala_Lumpur">Kuala Lumpur</option>
                      <option value="Asia/Singapore">Singapore</option>
                      <option value="Asia/Bangkok">Bangkok</option>
                      <option value="Asia/Jakarta">Jakarta</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div hidden={step !== 1}>
                <StepHeading
                  eyebrow="Local rules"
                  title="Set tax and price display."
                  description="These defaults keep pricing calculations consistent while still allowing channel-specific taxes later."
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field label="Country">
                    <select className={selectClass} defaultValue="MY" name="country">
                      <option value="MY">Malaysia</option>
                      <option value="SG">Singapore</option>
                      <option value="TH">Thailand</option>
                      <option value="ID">Indonesia</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </Field>
                  <Field label="Default tax rate (%)">
                    <Input
                      defaultValue="6"
                      inputMode="decimal"
                      max="100"
                      min="0"
                      name="taxRate"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                  <Field className="sm:col-span-2" label="Menu price display">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <RadioCard
                        defaultChecked
                        description="Displayed prices already include tax."
                        label="Tax inclusive"
                        name="pricesIncludeTax"
                        value="true"
                      />
                      <RadioCard
                        description="Tax is added to the displayed price."
                        label="Tax exclusive"
                        name="pricesIncludeTax"
                        value="false"
                      />
                    </div>
                  </Field>
                </div>
              </div>

              <div hidden={step !== 2}>
                <StepHeading
                  eyebrow="Guardrails"
                  title="Choose your margin targets."
                  description="RestroCost will use these as defaults for alerts and suggested prices. Margin and markup are always shown separately."
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field
                    hint="Common restaurant target: 25–35%"
                    label="Target food cost (%)"
                  >
                    <Input
                      defaultValue="30"
                      inputMode="decimal"
                      max="99.99"
                      min="0.01"
                      name="defaultFoodCostPercent"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                  <Field
                    hint="Must stay below 100%"
                    label="Target profit margin (%)"
                  >
                    <Input
                      defaultValue="40"
                      inputMode="decimal"
                      max="99.99"
                      min="0"
                      name="defaultProfitMargin"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                </div>
                <div className="mt-6 rounded-xl bg-[var(--forest-soft)] p-5">
                  <p className="text-sm font-medium text-[var(--forest)]">
                    How the two targets work together
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--forest)]/80">
                    Food-cost target suggests a base price from recipe cost.
                    Profit-margin target includes packaging, labor, utilities,
                    and overhead before recommending a final price.
                  </p>
                </div>
              </div>

              <div hidden={step !== 3}>
                <StepHeading
                  eyebrow="Break-even baseline"
                  title="What does it cost to open each month?"
                  description="Enter the monthly fixed-cost estimate used for break-even progress. Detailed recurring expenses come in Phase 4."
                />
                <div className="mt-8">
                  <Field
                    hint="Rent, salaried labor, insurance, licences, and other fixed overhead."
                    label="Monthly fixed expenses"
                  >
                    <Input
                      defaultValue="0"
                      inputMode="decimal"
                      min="0"
                      name="monthlyFixedExpenses"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                </div>
              </div>

              <div hidden={step !== 4}>
                <StepHeading
                  eyebrow="Operating location"
                  title="Create your first branch."
                  description="Inventory, purchases, sales, expenses, and waste are branch-aware from day one."
                />
                <div className="mt-8">
                  <Field label="Branch name">
                    <Input
                      defaultValue="Main Branch"
                      name="branchName"
                      placeholder="Main Branch"
                      required
                    />
                  </Field>
                </div>
              </div>

              <div hidden={step !== 5}>
                <StepHeading
                  eyebrow="Optional starter"
                  title="Add one ingredient now."
                  description="This creates a real opening inventory record. Leave the name blank to start with an empty ingredient list."
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field className="sm:col-span-2" label="Ingredient name">
                    <Input name="ingredientName" placeholder="Chicken thigh" />
                  </Field>
                  <Field label="Base unit">
                    <select className={selectClass} defaultValue="GRAM" name="ingredientUnit">
                      <option value="MILLIGRAM">Milligram</option>
                      <option value="GRAM">Gram</option>
                      <option value="KILOGRAM">Kilogram</option>
                      <option value="MILLILITER">Milliliter</option>
                      <option value="LITER">Liter</option>
                      <option value="UNIT">Unit</option>
                      <option value="PIECE">Piece</option>
                      <option value="DOZEN">Dozen</option>
                      <option value="TRAY">Tray</option>
                      <option value="BOX">Box</option>
                      <option value="BAG">Bag</option>
                      <option value="PACK">Pack</option>
                    </select>
                  </Field>
                  <Field label="Opening stock">
                    <Input defaultValue="0" min="0" name="ingredientStock" step="0.001" type="number" />
                  </Field>
                  <Field className="sm:col-span-2" label="Cost per base unit">
                    <Input defaultValue="0" min="0" name="ingredientCost" step="0.0001" type="number" />
                  </Field>
                </div>
              </div>

              <div hidden={step !== 6}>
                <StepHeading
                  eyebrow="Optional starter"
                  title="Turn that ingredient into a recipe."
                  description="A full recipe builder and automatic cost propagation arrive in Phase 3. This starter still saves as a real recipe record."
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field className="sm:col-span-2" label="Recipe name">
                    <Input name="recipeName" placeholder="House grilled chicken" />
                  </Field>
                  <Field label="Number of servings">
                    <Input defaultValue="1" min="0.001" name="recipeServings" step="0.001" type="number" />
                  </Field>
                  <Field label="Starter ingredient quantity">
                    <Input defaultValue="0" min="0" name="recipeIngredientQuantity" step="0.001" type="number" />
                  </Field>
                </div>
              </div>

              <div hidden={step !== 7}>
                <StepHeading
                  eyebrow="Last step"
                  title="Create your first menu item."
                  description="Leave this blank if you’d rather build the menu after the detailed recipe and pricing tools are available."
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field className="sm:col-span-2" label="Menu item name">
                    <Input name="menuItemName" placeholder="Grilled chicken plate" />
                  </Field>
                  <Field className="sm:col-span-2" label="Base selling price">
                    <Input defaultValue="0" min="0" name="menuItemPrice" step="0.01" type="number" />
                  </Field>
                </div>

                <div className="mt-7 rounded-xl border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--forest-soft)] text-[var(--forest)]">
                      <Check className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Ready to create your workspace</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Your owner membership, branch, cost targets, and any
                        optional starter records will be saved in one database
                        transaction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {state.error && (
                <div
                  aria-live="polite"
                  className="mt-6 rounded-lg border border-[var(--coral)]/25 bg-[var(--coral-soft)] px-3.5 py-3 text-sm text-[var(--coral)]"
                  role="alert"
                >
                  {state.error}
                </div>
              )}
            </div>
          </div>

          <footer className="sticky bottom-0 border-t bg-card/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-[620px] items-center justify-between">
              <Button
                disabled={step === 0}
                onClick={() => setStep((current) => current - 1)}
                type="button"
                variant="ghost"
              >
                <ArrowLeft />
                Back
              </Button>

              {isLastStep ? (
                <SubmitButton pendingLabel="Creating workspace…">
                  Finish setup
                  <ArrowRight />
                </SubmitButton>
              ) : (
                <Button
                  onClick={() => setStep((current) => current + 1)}
                  type="button"
                >
                  Continue
                  <ArrowRight />
                </Button>
              )}
            </div>
          </footer>
        </form>
      </section>
    </main>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--forest)]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-normal tracking-[-0.035em] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RadioCard({
  label,
  description,
  ...props
}: React.ComponentProps<"input"> & {
  label: string;
  description: string;
}) {
  return (
    <label className="relative flex cursor-pointer gap-3 rounded-lg border bg-card p-4 has-[:checked]:border-[var(--forest)] has-[:checked]:bg-[var(--forest-soft)]">
      <input className="mt-1 accent-[var(--forest)]" type="radio" {...props} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
