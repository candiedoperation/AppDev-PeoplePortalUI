/**
  App Dev Club People Portal UI
  Copyright (C) 2025  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as React from "react"
import logo from "../assets/logo.svg"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { SidebarUserInfo } from "./fabric/SidebarUserInfo"
import { Link, useLocation } from "react-router-dom"

interface SideBarMenuItemData {
  title: string,
  url?: string,
  items?: SideBarMenuItemData[]
}

const data: SideBarMenuItemData[] = [
    {
      title: "Organization",
      items: [
        {
          title: "People",
          url: "/org/people",
        },
        {
          title: "Teams",
          url: "/org/teams",
        },
      ],
    },

    {
      title: "Internal Tools",
      items: [
        {
          title: "Source Code Repository",
          url: "https://git.appdevclub.com",
        },
        {
          title: "Identity Management Portal",
          url: "https://auth.appdevclub.com"
        },
      ],
    },

    {
      title: "Community",
      items: [
        {
          title: "Events",
          url: "/events/list",
        },
      ],
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a style={{ cursor: 'pointer' }}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img src={logo} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">App Dev Club</span>
                  <span className="">People Portal Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  { 
                    item.url ?
                      <Link to={item.url} className="font-medium">{item.title}</Link> :
                      <span className="font-medium">{item.title}</span>
                  }
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={(item.url != undefined && location.pathname.includes(item.url))}>
                          <Link to={item.url ?? "#"}>{item.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserInfo user={{ name: "Atheesh", email: "atheesh@atheesh.org", avatar: "AT" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
