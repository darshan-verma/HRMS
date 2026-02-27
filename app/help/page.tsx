"use client";

import { HelpCircle, BookOpen, MessageSquare, FileText, ExternalLink } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";

const helpTopics = [
  {
    title: "Getting Started",
    description: "Learn the basics of the HRMS platform and initial setup",
    icon: BookOpen,
    color: "text-brand-600",
    bg: "bg-brand-50"
  },
  {
    title: "API Documentation",
    description: "Complete reference for all REST API endpoints",
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    title: "Contact Support",
    description: "Reach out to our team for technical assistance",
    icon: MessageSquare,
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  {
    title: "FAQs",
    description: "Frequently asked questions about modules and features",
    icon: HelpCircle,
    color: "text-violet-600",
    bg: "bg-violet-50"
  }
];

export default function HelpPage() {
  return (
    <DashboardLayout title="Help Center" subtitle="Documentation, guides, and support resources">
      <div className="grid gap-4 sm:grid-cols-2">
        {helpTopics.map((topic) => (
          <Card key={topic.title} className="cursor-pointer transition-all hover:border-brand-200 hover:shadow-md">
            <CardContent className="flex items-start gap-4 pt-5">
              <div className={`rounded-xl p-3 ${topic.bg}`}>
                <topic.icon size={22} className={topic.color} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{topic.title}</h3>
                  <ExternalLink size={14} className="text-slate-400" />
                </div>
                <p className="mt-1 text-xs text-slate-500">{topic.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <MessageSquare size={24} className="text-brand-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Need help?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Our support team is available to assist you with any questions about the
            HRMS platform. Reach out and we&apos;ll get back to you within 24 hours.
          </p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
            <MessageSquare size={16} />
            Contact Support
          </button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
