/**
  People Portal UI
  Copyright (C) 2026  Atheesh Thirumalairajan

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

import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPeopleList } from "@/components/fabric/DashboardPeopleList"
import { DashboardTeamInfo } from "@/components/fabric/DashboardTeamInfo"
import { DashboardTeamRecruitment } from "@/components/fabric/DashboardTeamRecuitment"
import { DashboardTeamsList } from "@/components/fabric/DashboardTeamsList"
import { OrgChartVisualization } from "@/components/fragments/OrgChartVisualization"
import { OrgTeamRequestReview } from "@/components/fragments/OrgTeamRequestReview"
import { PlatformLicenseInfo } from "@/components/fragments/PlatformLicenseInfo"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import React from "react"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

const translateBreadcrumbPath = (path: string) => {
    switch (path) {
        case "org":
            return "Organization"

        case "orgchart":
            return "Chart"

        case "teams":
            return "Teams"

        case "people":
            return "People"

        case "community":
            return "Community"

        case "events":
            return "Events"

        case "recruitment":
            return "Recruitment Tracker"

        case "platform":
            return "People Portal Platform"

        case "license":
            return "Licensing"

        default:
            return path
    }
}

interface BreadcrumbItem {
    name: string,
    path: string
}

export interface CorpUserInfo {
    name: string,
    avatar: string,
    email: string
}

export const CorpDashboard = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>([]);
    const [userInfo, setUserInfo] = React.useState<CorpUserInfo>({
        name: "Unknown",
        email: "unknown@unknown.local",
        avatar: ""
    });

    React.useEffect(() => {
        const path = location.pathname;
        const pathArr = path.split("/").filter(Boolean)
        const breadcrumbsList = pathArr.reduce((prev: BreadcrumbItem[], path: string) => {
            const crumbName = translateBreadcrumbPath(path)
            const accumulatedPath = (prev.length < 1) ? `/${path}` :
                `${prev[prev.length - 1].path}/${path}`

            /* Append to Accumulator */
            prev.push({
                name: crumbName,
                path: accumulatedPath
            })

            /* Return the Accumulator */
            return prev
        }, [])

        /* Update Crumbs */
        setBreadcrumbs(() => breadcrumbsList)
    }, [location]);

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/userinfo`)
            .then(async (response) => {
                if (response.status === 401) {
                    window.location.href = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/login`
                    return
                }

                try {
                    const userlistResponse: CorpUserInfo = await response.json()
                    setUserInfo(_ => userlistResponse)
                } catch (e) {
                    /* Backend likely returned a redirect to login page (HTML), so we should redirect */
                    window.location.href = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/login`
                }
            })
            .catch((e) => {
                toast.error("Failed to Fetch User Information: " + e.message)
            })
    }, []);

    return (
        <SidebarProvider>
            <AppSidebar userInfo={userInfo} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 px-6">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {
                                breadcrumbs.map((crumb, index) => (
                                    <>
                                        <BreadcrumbItem className="hidden md:block">
                                            {
                                                index < breadcrumbs.length - 1 ?
                                                    <BreadcrumbLink
                                                        onClick={() => { navigate(crumb.path) }}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        {crumb.name}
                                                    </BreadcrumbLink> :
                                                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                                            }
                                        </BreadcrumbItem>
                                        {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator className="hidden md:block" /> : <></>}
                                    </>
                                ))
                            }
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-6 pt-0 min-h-0 overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Navigate to="/org/people" />} />
                        <Route path="/org" element={<Navigate to="/org/people" />} />
                        <Route path="/org/people" element={<DashboardPeopleList />} />
                        <Route path="/org/teams" element={<DashboardTeamsList />} />
                        <Route path="/org/teams/:teamId" element={<DashboardTeamInfo />} />
                        <Route path="/org/teams/:teamId/recruitment" element={<DashboardTeamRecruitment />} />
                        <Route path="/org/teamrequests/:requestId" element={<OrgTeamRequestReview />} />
                        <Route path="/org/orgchart" element={<OrgChartVisualization />} />
                        <Route path="/platform/license" element={<PlatformLicenseInfo />} />
                    </Routes>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
