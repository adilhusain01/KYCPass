"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        className:
          "!rounded-[2px] !border-2 !border-black !bg-[#fff8e7] !text-black !shadow-[5px_5px_0_0_#111]",
      }}
    />
  );
}

