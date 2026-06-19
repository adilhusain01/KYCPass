"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, FileCheck2, KeyRound, Loader2, MailCheck, ShieldCheck, Upload, WalletCards } from "lucide-react";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { SessionDiagnostics } from "@/components/session-diagnostics";
import { StatusBlock } from "@/components/status-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  otpRequestSchema,
  otpVerifySchema,
  userProfileSchema,
  type UserProfileInput,
} from "@/lib/domain";
import { verifyAadhaarOfflineXml } from "@/lib/document-sources/aadhaar-offline";
import type { VerifiedDocumentClaims } from "@/lib/document-sources/types";
import {
  connectUserSession,
  disconnectUserSession,
  requestEmailOtp,
  submitLevelOneProfile,
  verifyEmailOtp,
} from "@/lib/t3/browser-client";
import { useWorkflowStore } from "@/store/workflow-store";

type OtpRequest = z.infer<typeof otpRequestSchema>;
type OtpVerify = z.infer<typeof otpVerifySchema>;

export default function OnboardingPage() {
  const connectingRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImportingDocument, setIsImportingDocument] = useState(false);
  const [verifiedDocument, setVerifiedDocument] = useState<VerifiedDocumentClaims | null>(null);
  const {
    address,
    userDid,
    otpEmail,
    emailVerified,
    levelOneIssued,
    setIdentity,
    setOtpEmail,
    clearOtpEmail,
    markEmailVerified,
    markLevelOneIssued,
  } = useWorkflowStore();

  const otpRequestForm = useForm<OtpRequest>({ resolver: zodResolver(otpRequestSchema) });
  const otpVerifyForm = useForm<OtpVerify>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { email: "", code: "" },
  });
  const profileForm = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      country_of_residence: "",
      document_issuance_country: "",
      address: "",
      ssn: "",
    },
  });

  const completed = [Boolean(userDid), emailVerified, levelOneIssued].filter(Boolean).length;

  async function connect() {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    try {
      if (userDid) disconnectUserSession();
      const session = await connectUserSession();
      setIdentity(session.address, session.did);
      toast.success("Terminal 3 session authenticated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MetaMask connection failed.");
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }

  async function requestOtp(values: OtpRequest) {
    try {
      await requestEmailOtp(values.email);
      setOtpEmail(values.email);
      otpVerifyForm.setValue("email", values.email);
      toast.success("OTP dispatched by Terminal 3.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP request failed.");
    }
  }

  async function verifyOtp(values: OtpVerify) {
    try {
      const result = await verifyEmailOtp(values.email, values.code);
      if (result.status === "otp_failed" || result.status === "otp_expired") {
        toast.error(`Terminal 3 returned ${result.status}.`);
        return;
      }
      markEmailVerified();
      otpVerifyForm.reset({ email: values.email, code: "" });
      toast.success("Email bound to your Terminal 3 DID.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed.");
    }
  }

  async function submitProfile(values: UserProfileInput) {
    try {
      await submitLevelOneProfile(values);
      markLevelOneIssued();
      profileForm.reset();
      setVerifiedDocument(null);
      toast.success("Level-1 profile accepted and credential issuance triggered.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile submission failed.");
    }
  }

  async function importOfficialDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImportingDocument(true);
    try {
      const document = await verifyAadhaarOfflineXml(await file.text());
      profileForm.reset(document.profile);
      setVerifiedDocument(document);
      toast.success("UIDAI signature verified. Review the imported fields before submission.");
    } catch (error) {
      setVerifiedDocument(null);
      toast.error(error instanceof Error ? error.message : "Official document verification failed.");
    } finally {
      setIsImportingDocument(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title="Establish your private identity."
        description="MetaMask signs the encrypted Terminal 3 session, a same-origin relay preserves node affinity, and profile values are submitted to the protected user contract."
        badge={`${completed}/3 complete`}
      />

      <div className="mt-8">
        <Progress value={(completed / 3) * 100} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatusBlock
          label="Wallet session"
          value={userDid ?? "Awaiting MetaMask approval"}
          status={userDid ? "ready" : "pending"}
        />
        <StatusBlock
          label="Verified contact"
          value={emailVerified ? otpEmail ?? "Verified" : "Email OTP required"}
          status={emailVerified ? "ready" : userDid ? "pending" : "blocked"}
        />
        <StatusBlock
          label="KYC credential"
          value={levelOneIssued ? "t3n.user-input.kyc.1" : "Level-1 profile incomplete"}
          status={levelOneIssued ? "ready" : emailVerified ? "pending" : "blocked"}
        />
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-3">
        <Card className={userDid ? "bg-[#b8ff2c]" : "bg-white"}>
          <CardHeader>
            <WalletCards className="size-8" />
            <CardTitle className="display-type mt-5 text-3xl font-bold">1. Connect wallet</CardTitle>
            <CardDescription>MetaMask proves control of the authenticator bound to your DID.</CardDescription>
          </CardHeader>
          <CardContent>
            {address ? (
              <div className="border-2 border-black bg-white p-3 font-mono text-xs break-all">
                {address}
              </div>
            ) : null}
            <Button className="mt-5 w-full" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="animate-spin" /> : userDid ? <Check /> : <KeyRound />}
              {isConnecting
                ? "Connecting Terminal 3 session"
                : userDid
                  ? "Reconnect Terminal 3 session"
                  : "Connect MetaMask"}
            </Button>
          </CardContent>
        </Card>

        <Card className={emailVerified ? "bg-[#b8ff2c]" : userDid ? "bg-white" : "bg-stone-200"}>
          <CardHeader>
            <MailCheck className="size-8" />
            <CardTitle className="display-type mt-5 text-3xl font-bold">2. Verify email</CardTitle>
            <CardDescription>Terminal 3 binds a verified contact after the OTP roundtrip.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {emailVerified && !otpEmail ? (
              <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111]">
                <div className="flex items-center gap-3 font-bold">
                  <Check className="size-5" />
                  Verified contact restored
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Terminal 3 retains the verified contact for this DID. KYCPass caches only the
                  completion marker, not the email address.
                </p>
              </div>
            ) : !otpEmail ? (
              <form onSubmit={otpRequestForm.handleSubmit(requestOtp)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" className="mt-2" {...otpRequestForm.register("email")} />
                  <p className="mt-1 text-xs text-red-700">{otpRequestForm.formState.errors.email?.message}</p>
                </div>
                <Button className="w-full" disabled={!userDid || otpRequestForm.formState.isSubmitting}>
                  {otpRequestForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={otpVerifyForm.handleSubmit(verifyOtp)} className="space-y-4">
                <div>
                  <Label htmlFor="code">Code sent to {otpEmail}</Label>
                  <Input id="code" inputMode="numeric" className="mt-2 font-mono" {...otpVerifyForm.register("code")} />
                  <p className="mt-1 text-xs text-red-700">{otpVerifyForm.formState.errors.code?.message}</p>
                </div>
                <Button className="w-full" disabled={emailVerified || otpVerifyForm.formState.isSubmitting}>
                  {otpVerifyForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <MailCheck />}
                  {emailVerified ? "Email verified" : "Verify code"}
                </Button>
                {!emailVerified ? (
                  <Button
                    type="button"
                    variant="neutral"
                    className="w-full bg-white"
                    onClick={() => {
                      clearOtpEmail();
                      otpVerifyForm.reset();
                    }}
                  >
                    Request a new OTP
                  </Button>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>

        <Card className={levelOneIssued ? "bg-[#b8ff2c]" : emailVerified ? "bg-white" : "bg-stone-200"}>
          <CardHeader>
            <ShieldCheck className="size-8" />
            <CardTitle className="display-type mt-5 text-3xl font-bold">3. Issue Level 1</CardTitle>
            <CardDescription>
              Values are sent to the T3 user contract and are not retained by KYCPass.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {levelOneIssued ? (
              <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111]">
                <div className="flex items-center gap-3 font-bold">
                  <ShieldCheck className="size-5" />
                  t3n.user-input.kyc.1 issued
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  The protected profile remains with Terminal 3. KYCPass does not restore or render
                  its field values.
                </p>
              </div>
            ) : (
              <form onSubmit={profileForm.handleSubmit(submitProfile)} className="grid gap-4">
              <div className="border-2 border-black bg-[#ff9d2e] p-4 shadow-[4px_4px_0_#111]">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="size-6 shrink-0" />
                  <strong className="display-type text-xl">Import an official document</strong>
                </div>
                <p className="mt-2 text-sm leading-6">
                  Current live adapter: UIDAI Aadhaar Paperless Offline e-KYC. Select the signed
                  XML after unzipping it locally with your share code.
                </p>
                <Label
                  htmlFor="official-document"
                  className="mt-4 flex cursor-pointer items-center justify-center gap-2 border-2 border-black bg-white px-4 py-3 font-bold shadow-[3px_3px_0_#111]"
                >
                  {isImportingDocument ? <Loader2 className="animate-spin" /> : <Upload />}
                  {isImportingDocument ? "Verifying UIDAI signature" : "Choose signed e-KYC XML"}
                </Label>
                <Input
                  id="official-document"
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  className="sr-only"
                  disabled={isImportingDocument}
                  onChange={importOfficialDocument}
                />
                <p className="mt-3 text-xs leading-5">
                  Verification runs in this browser. KYCPass does not upload or retain the XML,
                  signature, photo, reference ID, or Aadhaar number. Generate a signed file at{" "}
                  <Link
                    href="https://myaadhaar.uidai.gov.in/offline-ekyc"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline"
                  >
                    MyAadhaar
                  </Link>
                  .
                </p>
              </div>
              {verifiedDocument ? (
                <div className="border-2 border-black bg-[#b8ff2c] p-4 shadow-[4px_4px_0_#111]">
                  <div className="flex items-center gap-3 font-bold">
                    <Check className="size-5" />
                    Signature verified by {verifiedDocument.issuer}
                  </div>
                  <p className="mt-2 text-sm leading-6">
                    Imported fields are locked to the verified document and will be sent only to
                    the protected Terminal 3 profile when you submit.
                  </p>
                  <p className="mt-2 text-xs font-bold leading-5">
                    {verifiedDocument.validatedSourceFieldCount} source fields validated;{" "}
                    {verifiedDocument.mappedProfileFields.length} Terminal 3 fields mapped.
                  </p>
                  <p className="mt-2 text-xs leading-5">
                    UIDAI source integrity is verified locally. Terminal 3 still issues the honest
                    `t3n.user-input.kyc.1` credential; this does not fabricate Level 2 approval.
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">First name</Label>
                  <Input id="first_name" className="mt-2 bg-white" readOnly {...profileForm.register("first_name")} />
                </div>
                <div>
                  <Label htmlFor="last_name">Last name</Label>
                  <Input id="last_name" className="mt-2 bg-white" readOnly {...profileForm.register("last_name")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="country">Residence</Label>
                  <Input
                    id="country"
                    className="mt-2 bg-white uppercase"
                    maxLength={2}
                    readOnly
                    {...profileForm.register("country_of_residence")}
                  />
                </div>
                <div>
                  <Label htmlFor="issuer">Document country</Label>
                  <Input
                    id="issuer"
                    className="mt-2 bg-white uppercase"
                    maxLength={2}
                    readOnly
                    {...profileForm.register("document_issuance_country")}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Residential address</Label>
                <Input
                  id="address"
                  className="mt-2 bg-white"
                  readOnly
                  {...profileForm.register("address")}
                />
              </div>
              <Button disabled={!emailVerified || !verifiedDocument || profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Save verified claims to Terminal 3
              </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <SessionDiagnostics />
    </div>
  );
}
