import { UserPlus2Icon } from "lucide-react"
import { Button } from "../ui/button"
import React from "react";
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { UserInformationTable, type UserInformationBrief } from "../fragments/UserInformationTable";

interface TeamInfoResponse {
    team: TeamInfo,
    subteams: TeamInfo[]
}

interface TeamInfo {
    name: string,
    users: UserInformationBrief[],
    attributes: {
        friendlyName: string,
        teamType: string,
        seasonType: string,
        seasonYear: number,
    }
}

export const DashboardTeamInfo = () => {
    const params = useParams()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>();

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`)
            .then(async (response) => {
                const teamlistResponse: TeamInfoResponse = await response.json()
                setTeamInfo(teamlistResponse.team)
                setSubTeams(teamlistResponse.subteams)
            })

            .catch((e) => {
                toast.error("Failed to Fetch Team Information: " + e.message)
            })
    }, []);

    return (
        <div className="flex flex-col m-2">
            <div className="flex items-center">
                <div className="flex flex-col flex-grow-1">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{teamInfo?.attributes.friendlyName}</h1>
                    <h4 className="text-xl text-muted-foreground">{`${teamInfo?.attributes.seasonType} ${teamInfo?.attributes.seasonYear}`}</h4>
                </div>

                <Button>
                    <UserPlus2Icon />
                    Add Members
                </Button>
            </div>

            <Tabs className="mt-5" defaultValue="owner">
                <TabsList>
                    <TabsTrigger value="owner">Team Owners</TabsTrigger>
                    {
                        subTeams?.map((subteam) => {
                            let tabName = subteam.attributes.friendlyName;
                            if (tabName.endsWith("Engr"))
                                tabName = "Engineering Team"

                            else if (tabName.endsWith("Lead"))
                                tabName = "Project Leadership"

                            return (<TabsTrigger value={subteam.name}>{tabName}</TabsTrigger>)
                        })
                    }
                </TabsList>

                <div className="">
                    <TabsContent value="owner">
                        <UserInformationTable users={teamInfo?.users ?? []} />
                    </TabsContent>

                    {
                        subTeams?.map((subteam) => (
                            <TabsContent value={subteam.name}>
                                <UserInformationTable users={subteam.users ?? []} />
                            </TabsContent>
                        ))
                    }
                </div>
            </Tabs>
        </div>
    )
}