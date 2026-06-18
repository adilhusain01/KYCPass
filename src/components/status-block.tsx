import { Check, CircleAlert, CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatusBlock({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ready" | "pending" | "blocked";
}) {
  const Icon = status === "ready" ? Check : status === "pending" ? CircleDashed : CircleAlert;
  return (
    <div
      className={cn(
        "flex min-h-28 items-start justify-between border-2 border-black p-4 shadow-[4px_4px_0_#111]",
        status === "ready" && "bg-[#b8ff2c]",
        status === "pending" && "bg-white",
        status === "blocked" && "bg-[#ff8ac5]",
      )}
    >
      <div>
        <p className="code-type text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
        <p className="mt-4 break-all text-sm font-bold">{value}</p>
      </div>
      <Icon className="size-5 shrink-0" />
    </div>
  );
}

