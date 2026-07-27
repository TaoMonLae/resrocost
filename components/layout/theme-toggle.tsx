"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("restrocost-theme", nextDark ? "dark" : "light");
  }

  return (
    <Button
      aria-label="Toggle color theme"
      onClick={toggleTheme}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
