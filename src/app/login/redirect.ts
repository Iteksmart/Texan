function isRedirectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === 'NEXT_REDIRECT' || (error as Error & { digest?: string }).digest === 'NEXT_REDIRECT';
}

export default isRedirectError;
