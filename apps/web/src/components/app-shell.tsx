"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { Icon, type IconName } from "./icon";

type NavigationItem = {
  readonly available?: boolean;
  readonly href?: string;
  readonly icon: IconName;
  readonly label: string;
};

type NavigationGroup = {
  readonly items: ReadonlyArray<NavigationItem>;
  readonly label: string;
};

const navigationGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: "dashboard",
        available: true,
      },
    ],
  },
  {
    label: "Markets",
    items: [
      { label: "Arbitrage Scanner", icon: "scanner" },
      { label: "Funding Matrix", icon: "matrix" },
      { label: "Spread Charts", icon: "chart" },
      { label: "Favorites", icon: "heart" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Spread Calculator", icon: "calculator" },
      { label: "Strategy Lab", icon: "flask" },
      { label: "Alerts", icon: "bell" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Exchange Connections", icon: "wallet" },
      { label: "Security", icon: "shield" },
      { label: "Settings", icon: "settings" },
      { label: "History", icon: "history" },
    ],
  },
] as const satisfies ReadonlyArray<NavigationGroup>;

const storageKey = "arbitrage.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previouslyFocused = document.activeElement;
    const openButton = mobileOpenButton.current;
    let focusFrame = 0;
    let remainingFocusFrames = 30;
    const focusWhenVisible = () => {
      const closeButton =
        sidebar.current?.querySelector<HTMLButtonElement>(".mobile-close");

      if (
        closeButton &&
        window.getComputedStyle(closeButton).visibility !== "hidden"
      ) {
        closeButton.focus();
        return;
      }

      remainingFocusFrames -= 1;
      if (remainingFocusFrames > 0) {
        focusFrame = window.requestAnimationFrame(focusWhenVisible);
      }
    };
    focusFrame = window.requestAnimationFrame(focusWhenVisible);

    const keepFocusInDrawer = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sidebar.current) {
        return;
      }

      const focusable = Array.from(
        sidebar.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!sidebar.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", keepFocusInDrawer);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", keepFocusInDrawer);
      window.setTimeout(() => {
        if (
          previouslyFocused instanceof HTMLElement &&
          previouslyFocused.isConnected
        ) {
          previouslyFocused.focus();
        } else {
          openButton?.focus();
        }
      }, 0);
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  return (
    <div className="app-shell" data-collapsed={collapsed}>
      <header className="mobile-header" inert={mobileOpen ? true : undefined}>
        <Link className="mobile-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="zap" size={16} />
          </span>
          <span>Arbitrage</span>
        </Link>
        <button
          aria-controls="primary-sidebar"
          aria-expanded={mobileOpen}
          aria-label="Open navigation"
          className="icon-button"
          onClick={() => setMobileOpen(true)}
          ref={mobileOpenButton}
          type="button"
        >
          <Icon name="menu" size={20} />
        </button>
      </header>

      {mobileOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <aside
        aria-label={mobileOpen ? "Primary navigation drawer" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        className="sidebar"
        data-mobile-open={mobileOpen}
        id="primary-sidebar"
        ref={sidebar}
        role={mobileOpen ? "dialog" : undefined}
      >
        <div className="sidebar-brand">
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <span className="brand-mark" aria-hidden="true">
              <Icon name="zap" size={17} />
            </span>
            <span className="sidebar-label">
              Arbitrage
              <small>Analytics foundation</small>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="icon-button mobile-close"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <Icon name="x" size={19} />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="sidebar-nav">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              <ul>
                {group.items.map((item) => {
                  return (
                    <li key={item.label}>
                      {"available" in item && item.available ? (
                        <Link
                          aria-current="page"
                          href={item.href ?? "/"}
                          onClick={() => setMobileOpen(false)}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon name={item.icon} />
                          <span className="sidebar-label">{item.label}</span>
                        </Link>
                      ) : (
                        <span
                          aria-disabled="true"
                          className="nav-disabled"
                          title={
                            collapsed
                              ? `${item.label} — planned for a later phase`
                              : undefined
                          }
                        >
                          <Icon name={item.icon} />
                          <span className="sidebar-label">{item.label}</span>
                          <Icon
                            className="nav-lock sidebar-label"
                            label="Planned for a later phase"
                            name="lock"
                            size={13}
                          />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-summary">
            <span className="profile-avatar" aria-hidden="true">
              <Icon name="user" size={19} />
            </span>
            <span className="sidebar-label">
              Foundation user
              <small>
                <Icon name="sparkles" size={11} />
                Phase 1 preview
              </small>
            </span>
          </div>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="collapse-button"
            onClick={toggleCollapsed}
            tabIndex={mobileOpen ? -1 : undefined}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? <Icon name="panel" /> : <Icon name="chevronLeft" />}
            <span className="sidebar-label">Collapse</span>
          </button>
        </div>
      </aside>

      <main className="app-content" inert={mobileOpen ? true : undefined}>
        {children}
      </main>
    </div>
  );
}
