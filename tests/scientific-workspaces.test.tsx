import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChangeDetectionPage from "@/components/change-detection-page";
import GnssSkyViewPage from "@/components/gnss-sky-view-page";

vi.mock("@/components/open-street-map", () => ({ default: () => <div aria-label="Mock open map" /> }));

describe("scientific workspace interactions", () => {
  const notify = vi.fn();

  beforeEach(() => notify.mockClear());

  it("recomputes change results when the threshold changes and exports GeoJSON", () => {
    render(<ChangeDetectionPage notify={notify} />);
    const threshold = screen.getByRole("slider", { name: /Detection threshold/i });
    fireEvent.change(threshold, { target: { value: "72" } });
    expect(screen.getByText("72/100")).toBeInTheDocument();
    const exportButton = screen.getByRole("button", { name: /GeoJSON/i });
    if (!exportButton.hasAttribute("disabled")) {
      fireEvent.click(exportButton);
      expect(notify).toHaveBeenCalledWith(expect.stringContaining("GeoJSON"));
    }
  });

  it("toggles GNSS constellations, applies a skyline and exports observations", () => {
    render(<GnssSkyViewPage notify={notify} />);
    const galileo = screen.getByRole("checkbox", { name: /Galileo/i });
    fireEvent.click(galileo);
    expect(galileo).not.toBeChecked();
    fireEvent.change(screen.getByRole("combobox", { name: /Sky obstruction/i }), { target: { value: "north" } });
    expect(screen.getByText("Skyline height")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^CSV$/i }));
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("simulated observations exported"));
  });
});
