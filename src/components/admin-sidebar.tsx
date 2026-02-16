"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { CheckSquare, LayoutDashboard, LogOut, MessageCircle, Newspaper, Radar } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navGroups = [
  {
    label: "",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Inputs",
    items: [
      { title: "Radar", href: "/admin/radar", icon: Radar },
      { title: "Engage", href: "/admin/engage", icon: MessageCircle },
      { title: "Newsletter", href: "/admin/newsletter", icon: Newspaper },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Tasks", href: "/admin/tasks", icon: CheckSquare },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  return (
    <Sidebar collapsible="none" className="min-h-svh">
      <SidebarHeader className="px-4 pt-4 pb-2">
        <Link href="/">
          <img
            src="/avatar.jpg"
            alt="Moltzart"
            className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label || "overview"}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href)
                      }
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
