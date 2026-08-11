import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RuntimeBoundary from "@/components/runtime-boundary";
import { fetchWithTimeout } from "@/lib/network";
import { getLayerFreshness, getLayerLicenceClass, RWANDA_ONLINE_MAP_LAYERS } from "@/lib/rwanda-map-catalog";

afterEach(() => vi.unstubAllGlobals());

describe("reliability boundaries", () => {
  it("contains a component failure and permits a retry", () => {
    const originalError = console.error;
    console.error = vi.fn();
    let shouldFail = true;
    function Recoverable() {
      if (shouldFail) throw new Error("simulated map failure");
      return <p>Workspace recovered</p>;
    }
    render(<RuntimeBoundary resetKey="map"><Recoverable /></RuntimeBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("could not finish rendering");
    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /Retry workspace/i }));
    expect(screen.getByText("Workspace recovered")).toBeInTheDocument();
    console.error = originalError;
  });

  it("retries a transient public-service response once", async () => {
    const remoteFetch = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", remoteFetch);
    const response = await fetchWithTimeout("https://example.test/service", {}, { timeoutMs: 1_000, retries: 1, retryDelayMs: 0 });
    expect(response.status).toBe(200);
    expect(remoteFetch).toHaveBeenCalledTimes(2);
  });
});

describe("source metadata policy", () => {
  it("classifies licence terms and separates freshness dates", () => {
    const open = RWANDA_ONLINE_MAP_LAYERS.find((layer) => layer.licence === "Public Domain");
    const verify = RWANDA_ONLINE_MAP_LAYERS.find((layer) => layer.licence.includes("verify reuse"));
    expect(open && getLayerLicenceClass(open)).toBe("open");
    expect(verify && getLayerLicenceClass(verify)).toBe("verify");
    const freshness = getLayerFreshness(RWANDA_ONLINE_MAP_LAYERS[0]);
    expect(freshness).toHaveProperty("observation");
    expect(freshness).toHaveProperty("publication");
    expect(freshness).toHaveProperty("endpointCheck");
  });
});
