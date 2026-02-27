"use client";

import { Settings, Building2, Shield, Bell, Palette } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const settingsSections = [
  {
    title: "Organization",
    description: "Manage organization name, logo, and basic information",
    icon: Building2,
    color: "text-brand-600",
    bg: "bg-brand-50"
  },
  {
    title: "Security",
    description: "Configure authentication, passwords, and access policies",
    icon: Shield,
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    title: "Notifications",
    description: "Email and in-app notification preferences",
    icon: Bell,
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  {
    title: "Appearance",
    description: "Theme, branding, and display preferences",
    icon: Palette,
    color: "text-violet-600",
    bg: "bg-violet-50"
  }
];

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" subtitle="Manage your HRMS configuration">
      <div className="grid gap-4 sm:grid-cols-2">
        {settingsSections.map((section) => (
          <Card key={section.title} className="cursor-pointer transition-all hover:border-brand-200 hover:shadow-md">
            <CardContent className="flex items-start gap-4 pt-5">
              <div className={`rounded-xl p-3 ${section.bg}`}>
                <section.icon size={22} className={section.color} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{section.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Current HRMS configuration details</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Version", value: "0.1.0" },
              { label: "Environment", value: "Development" },
              { label: "Organization ID", value: "seed-org" },
              { label: "Database", value: "PostgreSQL + Prisma" },
              { label: "Queue", value: "BullMQ + Redis" },
              { label: "Storage", value: "AWS S3" }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
