import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShieldAlert, Package, Code, ScaleIcon, FileText, ExternalLinkIcon } from 'lucide-react';
import frontendPackage from '@root/package.json';
// @ts-ignore
import frontendLicense from '@root/LICENSE?raw';

// Interface matching Backend Response
interface PlatformLicenseResponse {
    licenseText: string;
    dependencies: { name: string; version: string }[];
}

export const PlatformLicenseInfo = () => {
    const [data, setData] = useState<PlatformLicenseResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/platform/license")
            .then(res => res.json())
            .then(json => {
                setData(json);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const frontendDeps = frontendPackage.dependencies
        ? Object.entries(frontendPackage.dependencies).map(([name, version]) => ({ name, version }))
        : [];

    const LicenseModal = ({ title, description, content }: { title: string, description: string, content: string }) => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    View {title}
                    <ExternalLinkIcon className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl min-w-[64vw] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 p-4 border rounded-md bg-muted/10 h-full overflow-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                        {content}
                    </pre>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="flex flex-1 flex-col gap-4 pt-0 h-full">
            {/* Header Area */}
            <div className="flex flex-col gap-1 shrink-0 mt-2">
                <h1 className="text-2xl font-bold tracking-tight">Platform Licensing</h1>
                <p className="text-muted-foreground">
                    Software license information and third-party dependencies.
                </p>
            </div>

            <div className="flex flex-col gap-4 flex-1 overflow-auto">
                {/* Main License Card */}
                <Card className="flex gap-1 flex-col shrink-0">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="flex flex-grow-1 items-center gap-2">
                            <ScaleIcon className="h-5 w-5 text-orange-400" />
                            <div>
                                <CardTitle className="text-lg">People Portal License</CardTitle>
                                <CardDescription>Copyright © {new Date().getFullYear()} Atheesh Thirumalairajan</CardDescription>
                            </div>
                        </div>
                        <LicenseModal
                            title="UI License"
                            description="GNU General Public License v3.0 (Frontend)"
                            content={frontendLicense}
                        />
                        <LicenseModal
                            title="Server License"
                            description="GNU General Public License v3.0 (Backend)"
                            content={loading ? "Loading..." : data?.licenseText || "Unavailable"}
                        />
                    </CardContent>
                </Card>

                {/* Dependencies Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0" style={{ paddingBottom: 0 }}>
                    {/* Frontend Dependencies */}
                    <Card className="flex flex-col overflow-hidden gap-0">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Code className="h-5 w-5 text-purple-600" />
                                <div>
                                    <CardTitle className="text-base">Frontend Dependencies</CardTitle>
                                    <CardDescription>Client-side packages (React/Vite)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden" style={{ paddingBottom: 0 }}>
                            <ScrollArea className="h-full w-full">
                                <div className="flex flex-col divide-y">
                                    {frontendDeps.map((dep, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 px-4 hover:bg-muted/50 text-sm">
                                            <span className="font-medium truncate mr-2">{dep.name}</span>
                                            <Badge variant="secondary" className="font-mono text-xs shrink-0">{dep.version}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Backend Dependencies */}
                    <Card className="flex flex-col overflow-hidden gap-0">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <CardTitle className="text-base">Backend Dependencies</CardTitle>
                                    <CardDescription>Server-side packages (Node.js)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden">
                            <ScrollArea className="h-full w-full">
                                <Accordion type="single" collapsible className="w-full">
                                    {loading ? (
                                        <div className="p-4 text-sm text-muted-foreground">Loading dependencies...</div>
                                    ) : (
                                        <div className="flex flex-col divide-y">
                                            {data?.dependencies.map((dep, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 px-4 hover:bg-muted/50 text-sm">
                                                    <span className="font-medium truncate mr-2">{dep.name}</span>
                                                    <Badge variant="outline" className="font-mono text-xs shrink-0">{dep.version}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Accordion>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};