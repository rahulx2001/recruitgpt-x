"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { AlertTriangle, ShieldCheck, Scale, MapPin, GraduationCap, Users, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

export function BiasReportCard({ jobId }: { jobId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["bias", jobId],
    queryFn: () => api.biasReport(jobId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Bias Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 skeleton rounded" />
            <div className="h-4 skeleton rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }
  if (error || !data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Bias Audit
          </CardTitle>
          <Badge
            variant={data.overall_fairness_score >= 0.6 ? "emerald" : data.overall_fairness_score >= 0.4 ? "amber" : "rose"}
          >
            {Math.round(data.overall_fairness_score * 100)}% fair
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-xs text-ink-muted">
          Analysis of the top {data.shortlist_size} candidates across demographic dimensions.
        </div>

        <DistributionRow icon={Users} label="Gender" data={data.gender_distribution} />
        <DistributionRow icon={Globe} label="Ethnicity" data={data.ethnicity_distribution} />
        <DistributionRow icon={GraduationCap} label="School" data={data.school_distribution} />
        <DistributionRow icon={MapPin} label="Location" data={data.location_distribution} />

        {data.flags.length > 0 ? (
          <div className="space-y-2 pt-2 border-t border-bg-border">
            <div className="text-xs font-semibold text-ink flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Flags
            </div>
            {data.flags.map((flag, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2"
              >
                {flag}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            No bias flags detected. Shortlist shows healthy distribution.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DistributionRow({
  icon: Icon,
  label,
  data,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  data: Record<string, number>;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3 w-3 text-ink-subtle" />
        <span className="text-xs text-ink-muted">{label}</span>
      </div>
      <div className="space-y-1.5">
        {Object.entries(data).map(([key, count], i) => {
          const pct = count / total;
          return (
            <div key={key}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-ink truncate">{key}</span>
                <span className="text-ink-muted font-mono">
                  {count} ({Math.round(pct * 100)}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="h-full rounded-full bg-brand"
                />
              </div>
            </div>
          );
        })}
        {Object.keys(data).length === 0 && (
          <div className="text-[10px] text-ink-subtle italic">No data</div>
        )}
      </div>
    </div>
  );
}
