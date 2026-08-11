export type FetchPolicy = { timeoutMs?: number; retries?: number; retryDelayMs?: number };

function retryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, policy: FetchPolicy = {}) {
  const timeoutMs = policy.timeoutMs ?? 10_000;
  const retries = policy.retries ?? 1;
  const retryDelayMs = policy.retryDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    try {
      const response = await fetch(input, { ...init, signal });
      if (!retryableStatus(response.status) || attempt === retries) return response;
      lastError = new Error(`Remote service returned ${response.status}`);
    } catch (error) {
      lastError = error;
      if (init.signal?.aborted || attempt === retries) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
  }

  throw lastError instanceof Error ? lastError : new Error("Remote service request failed");
}
