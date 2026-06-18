"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, Check, ClipboardCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { claimCatalog, claimIds, requirementSchema, type ClaimId } from "@/lib/domain";
import { isTeeReachableVerifierOrigin } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/workflow-store";

const verifierFormSchema = z.object({
  verifierName: z.string().min(2),
  purpose: z.string().min(10),
  requestedClaims: z.array(z.enum(claimIds)).min(1),
});
type VerifierForm = z.infer<typeof verifierFormSchema>;

export default function VerifierPage() {
  const router = useRouter();
  const setRequirement = useWorkflowStore((state) => state.setRequirement);
  const verifierOrigin =
    process.env.NEXT_PUBLIC_VERIFIER_ORIGIN ?? "http://localhost:3000";
  const verifierTeeReachable = isTeeReachableVerifierOrigin(verifierOrigin);
  const defaults = useMemo<VerifierForm>(
    () => ({
      verifierName: "Northstar Digital Bank",
      purpose: "Open a regulated savings account and satisfy customer identity checks.",
      requestedClaims: ["full_name", "verified_email", "country_of_residence"],
    }),
    [],
  );
  const form = useForm<VerifierForm>({
    resolver: zodResolver(verifierFormSchema),
    defaultValues: defaults,
  });

  function createRequest(values: VerifierForm) {
    const requirement = requirementSchema.parse({
      id: `req-${crypto.randomUUID()}`,
      verifierName: values.verifierName,
      verifierOrigin,
      purpose: values.purpose,
      requestedClaims: values.requestedClaims,
      // This value is created only in direct response to the user's submit event.
      // eslint-disable-next-line react-hooks/purity
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    setRequirement(requirement);
    router.push("/consent");
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Relying-party simulator"
        title="Request claims, not documents."
        description="This verifier creates a real, typed disclosure request. It cannot receive anything outside the selected claim set, and the user must approve the Terminal 3 grant before execution."
        badge="No file uploads"
      />

      <form onSubmit={form.handleSubmit(createRequest)} className="mt-10 grid gap-7 lg:grid-cols-[0.72fr_1.28fr]">
        <Card className="blue-panel h-fit">
          <CardHeader>
            <Building2 className="size-9" />
            <CardTitle className="display-type mt-6 text-4xl font-bold">Verifier identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="verifierName">Organization</Label>
              <Input id="verifierName" className="mt-2 bg-white text-black" {...form.register("verifierName")} />
            </div>
            <div>
              <Label htmlFor="purpose">Declared purpose</Label>
              <Textarea id="purpose" className="mt-2 min-h-32 bg-white text-black" {...form.register("purpose")} />
            </div>
            <div className="border-2 border-white bg-black p-4 font-mono text-xs">
              <p className="uppercase tracking-[0.16em] text-[#b8ff2c]">Allowed egress</p>
              <p className="mt-2 break-all">{verifierOrigin}</p>
            </div>
            {!verifierTeeReachable ? (
              <div className="border-2 border-black bg-[#ff9d2e] p-4 text-black">
                <TriangleAlert />
                <p className="mt-2 font-bold">Local request preview only</p>
                <p className="mt-1 text-xs leading-5">
                  Deploy to public HTTPS before grant approval and TEE execution.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ClipboardCheck className="size-9" />
            <CardTitle className="display-type mt-6 text-4xl font-bold">Required claims</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={form.control}
              name="requestedClaims"
              render={({ field }) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  {claimIds.map((claim) => {
                    const selected = field.value.includes(claim);
                    const item = claimCatalog[claim];
                    return (
                      <button
                        type="button"
                        key={claim}
                        onClick={() =>
                          field.onChange(
                            selected
                              ? field.value.filter((value: ClaimId) => value !== claim)
                              : [...field.value, claim],
                          )
                        }
                        className={cn(
                          "min-h-40 border-2 border-black p-5 text-left transition-transform",
                          selected
                            ? "translate-x-1 translate-y-1 bg-[#b8ff2c] shadow-none"
                            : "bg-white shadow-[5px_5px_0_#111]",
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <strong className="display-type text-2xl">{item.label}</strong>
                          <span className="grid size-7 place-items-center border-2 border-black bg-white">
                            {selected ? <Check className="size-4" /> : null}
                          </span>
                        </span>
                        <span className="mt-4 block text-sm leading-6 text-stone-700">{item.description}</span>
                        <span className="code-type mt-4 block text-[10px] uppercase tracking-[0.15em]">
                          Sensitivity: {item.sensitivity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            <p className="mt-3 text-sm text-red-700">{form.formState.errors.requestedClaims?.message}</p>
            <Button size="lg" className="mt-7 w-full">
              Create consent request <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
