import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GovernmentUpdatesPage from "@/components/government-updates-page";
import { RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS } from "@/lib/rwanda-government-social";

describe("Rwanda government updates workspace", () => {
  it("filters the verified institutional directory by sector and search phrase", () => {
    const { container } = render(<GovernmentUpdatesPage notify={vi.fn()} />);

    expect(within(screen.getByLabelText("Government update coverage")).getByText(String(RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS.length))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Infrastructure & utilities" }));
    expect(screen.getByText("Rwanda Energy Group")).toBeInTheDocument();
    expect(screen.getByText("Water and Sanitation Corporation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All channels" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Search official public channels/i }), { target: { value: "forestry" } });
    expect(screen.getByText("Rwanda Forestry Authority")).toBeInTheDocument();
    expect(container.querySelector(".updates-result-count")).toHaveTextContent("1 verified channel shown");
  });

  it("keeps the third-party timeline behind an explicit privacy choice", () => {
    render(<GovernmentUpdatesPage notify={vi.fn()} />);
    expect(screen.getByText(/Loading the timeline contacts X/i)).toBeInTheDocument();
    expect(document.getElementById("x-wjs")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Load @Lands_Rwanda posts/i }));
    expect(document.getElementById("x-wjs")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Loading public posts/i);
  });
});
