import {
  BarChart3,
  BookOpen,
  Boxes,
  Calculator,
  ChefHat,
  CircleDollarSign,
  FlaskConical,
  Gauge,
  HandCoins,
  Receipt,
  Settings,
  ShoppingBasket,
  Store,
  Trash2,
  Truck,
  Users,
} from "lucide-react";

export const navigation = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: Gauge, phase: 1 }],
  },
  {
    label: "Cost control",
    items: [
      { label: "Ingredients", href: "/ingredients", icon: ShoppingBasket, phase: 2 },
      { label: "Inventory", href: "/inventory", icon: Boxes, phase: 2 },
      { label: "Suppliers", href: "/suppliers", icon: Truck, phase: 2 },
      { label: "Purchases", href: "/purchases", icon: Receipt, phase: 2 },
      { label: "Recipes", href: "/recipes", icon: BookOpen, phase: 3 },
      { label: "Menu items", href: "/menu-items", icon: ChefHat, phase: 3 },
      { label: "Pricing", href: "/pricing", icon: Calculator, phase: 3 },
      { label: "Sales channels", href: "/sales-channels", icon: Store, phase: 3 },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Sales", href: "/sales", icon: CircleDollarSign, phase: 4 },
      { label: "Expenses", href: "/expenses", icon: HandCoins, phase: 4 },
      { label: "Waste", href: "/waste", icon: Trash2, phase: 4 },
      { label: "Reports", href: "/reports", icon: BarChart3, phase: 5 },
      {
        label: "Scenario simulator",
        href: "/scenario-simulator",
        icon: FlaskConical,
        phase: 6,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Team", href: "/team", icon: Users, phase: 6 },
      { label: "Settings", href: "/settings", icon: Settings, phase: 6 },
    ],
  },
] as const;
