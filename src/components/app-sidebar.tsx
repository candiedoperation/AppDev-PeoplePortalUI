import { Link } from "react-router-dom"
import * as React from "react"
import {
    BookOpen,
    Building2,
    FingerprintIcon,
    FolderGit2Icon,
    LifeBuoyIcon,
    NetworkIcon,
    PersonStandingIcon,
    ScaleIcon,
    Terminal,
    TicketIcon,
    Users,
    UsersRoundIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import logo from "../assets/logo.svg"
import type { CorpUserInfo } from "@/pages/CorpDashboard"

const data = {
    navMain: [
        {
            title: "Organization",
            url: "#",
            icon: Building2,
            isActive: true,
            items: [
                {
                    icon: PersonStandingIcon,
                    title: "People",
                    url: "/org/people",
                },
                {
                    icon: UsersRoundIcon,
                    title: "Teams",
                    url: "/org/teams",
                },
                {
                    icon: NetworkIcon,
                    title: "Org Chart",
                    url: "/org/orgchart",
                },
            ],
        },
        {
            title: "Internal Tools",
            url: "#",
            icon: Terminal,
            items: [
                {
                    icon: FolderGit2Icon,
                    title: "Source Code Repository",
                    url: "https://git.appdevclub.com",
                },
                {
                    icon: FingerprintIcon,
                    title: "Identity Management Portal",
                    url: "https://auth.appdevclub.com",
                },
            ],
        },
        {
            title: "Community",
            url: "#",
            icon: Users,
            items: [
                {
                    icon: TicketIcon,
                    title: "Events",
                    url: "/community/events",
                },
            ],
        },
        {
            title: "Platform Information",
            url: "#",
            icon: BookOpen,
            items: [
                {
                    icon: ScaleIcon,
                    title: "Licensing",
                    url: "/platform/license",
                },
                {
                    icon: LifeBuoyIcon,
                    title: "Support Docs",
                    url: "https://wiki.appdevclub.com/people-portal-user-guide/intro",
                },
            ],
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar> & { userInfo: CorpUserInfo }) {
    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <img src={logo} alt="ADC Logo" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">App Dev Club</span>
                                    <span className="truncate text-xs">People Portal Platform</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={{
                    name: props.userInfo.name,
                    email: props.userInfo.email,
                    avatar: props.userInfo.avatar
                }} />
            </SidebarFooter>
        </Sidebar>
    )
}
