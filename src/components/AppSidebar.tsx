"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  BookOpen,
  Brain,
  ChevronLeft,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Lightbulb,
  Menu,
  NotebookPen,
  PenLine,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { kind: "divider" as const, label: "英语学习" },
  { href: "/listening", label: "精听研习", icon: Headphones },
  { href: "/notebook", label: "生词本", icon: BookOpen },
  { href: "/dictation", label: "听写", icon: PenLine },
  { href: "/sentences", label: "句子本", icon: NotebookPen },
  { kind: "divider" as const, label: "AI 学习" },
  { href: "/learn", label: "博学研习", icon: Lightbulb },
  { href: "/grammar", label: "语法学习", icon: Brain },
  { kind: "divider" as const, label: "管理" },
  { href: "/upload", label: "上传素材", icon: Upload },
];

type NavItem =
  | { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; kind?: undefined }
  | { kind: "divider"; label: string; href?: undefined; icon?: undefined };

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  if (isAuthPage) return null;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-card-bg border border-card-border shadow-sm lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-sidebar-bg border-r border-sidebar-border
          flex flex-col sidebar-transition
          lg:relative lg:z-auto
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-[68px]" : "w-[240px]"}
        `}
      >
        {/* Header */}
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <GraduationCap size={22} className="text-accent shrink-0" />
              <span className="font-semibold text-sm truncate">
                Study World
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto">
              <GraduationCap size={22} className="text-accent" />
            </Link>
          )}

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1 rounded-md hover:bg-accent-light lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {(NAV_ITEMS as NavItem[]).map((item, i) => {
            if (item.kind === "divider") {
              return collapsed ? (
                <div
                  key={i}
                  className="my-3 mx-2 h-px bg-sidebar-border"
                />
              ) : (
                <div
                  key={i}
                  className="pt-4 pb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted"
                >
                  {item.label}
                </div>
              );
            }

            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg text-sm font-medium transition-colors
                  ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"}
                  ${
                    active
                      ? "bg-sidebar-active text-sidebar-active-text"
                      : "text-muted hover:bg-accent-light hover:text-foreground"
                  }
                `}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-2">
          <div
            className={`flex items-center gap-3 px-3 py-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
            {!collapsed && user && (
              <span className="text-sm text-foreground truncate">
                {user.firstName || user.username || "同学"}
              </span>
            )}
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-accent-light transition-colors"
          >
            <ChevronLeft
              size={16}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>收起</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
