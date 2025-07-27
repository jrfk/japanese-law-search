"use client"

import * as React from "react"
import {
  BookOpenIcon,
  MessageSquareIcon,
  SearchIcon,
  SettingsIcon,
  HelpCircleIcon,
  ScaleIcon,
  PlusIcon,
} from "lucide-react"

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavConversations } from '@/components/nav-conversations'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  navMain: [
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
    {
      title: "Documents",
      url: "#",
      icon: BookOpenIcon,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Help",
      url: "#",
      icon: HelpCircleIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <ScaleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">日本法律検索</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavConversations />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content if needed */}
      </SidebarFooter>
    </Sidebar>
  )
}