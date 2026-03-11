"use client";

import Image from "next/image";
import { PricingTable } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useCurrentTheme } from "@/hooks/use-current-theme";

export default function Page() {
  const currentTheme = useCurrentTheme();

  return (
    <div className="flex items-center justify-center w-full px-4 py-8">
      <div className="max-w-5xl w-full">
        <section className="space-y-8 flex flex-col items-center">
          <Image
            src="/logo.svg"
            width={48}
            height={48}
            alt="logo"
            className="hidden md:block dark:invert"
          />

          <h1 className="text-xl md:text-3xl font-bold text-center">
            Pricing
          </h1>

          <p className="text-muted-foreground text-center text-sm md:text-base">
            Choose the plan that fits your needs
          </p>
        </section>

        <div className="w-full mt-8">
          <PricingTable
            appearance={{
              baseTheme: currentTheme === "dark" ? dark : undefined,
              elements: {
                pricingTableCard: "border shadow-none rounded-lg",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}