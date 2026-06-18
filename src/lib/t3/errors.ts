export function isLevelTwoNotInitiatedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /precondition_failed: kyc-status called before create-kyc-provider-session/i.test(message);
}
