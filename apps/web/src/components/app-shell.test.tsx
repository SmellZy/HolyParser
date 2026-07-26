import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the available route and marks future routes as unavailable", () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Arbitrage Scanner").parentElement).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("persists the desktop collapsed preference", () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(window.localStorage.getItem("arbitrage.sidebar.collapsed")).toBe(
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("opens and closes the mobile navigation", async () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    const openButton = screen.getByRole("button", {
      name: "Open navigation",
    });
    openButton.focus();
    fireEvent.click(openButton);

    expect(openButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: "Primary navigation drawer" }),
    ).toHaveAttribute("aria-modal", "true");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close navigation" }),
      ).toHaveFocus(),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(openButton).toHaveFocus());
  });

  it("keeps keyboard focus inside the open mobile drawer", async () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    const openButton = screen.getByRole("button", {
      name: "Open navigation",
    });
    openButton.focus();
    fireEvent.click(openButton);

    const dialog = screen.getByRole("dialog", {
      name: "Primary navigation drawer",
    });
    const brand = within(dialog).getByRole("link", {
      name: /Arbitrage/,
    });
    const dashboard = screen.getByRole("link", { name: "Dashboard" });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close navigation" }),
      ).toHaveFocus(),
    );
    dashboard.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(brand).toHaveFocus();

    brand.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(dashboard).toHaveFocus();
  });
});
