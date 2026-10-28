export interface DashboardStats {
  generatedAt: string;
  scope: "ALL" | "OWN";
  kpis: {
    openPipelineValue: number;
    openDeals: number;
    weightedPipeline: number;
    scoredOpenDeals: number;
    wonThisMonthValue: number;
    wonThisMonthCount: number;
    winRate: number | null;
    closedLast12Months: number;
    openTasks: number;
    overdueTasks: number;
  };
  pipelineByStage: { stage: string; value: number; count: number }[];
  leadsBySource: { source: string; count: number }[];
  forecast: {
    months: {
      key: string;
      label: string;
      /** Won revenue (history and current month to date). */
      actual: number | null;
      /** Linear trend fitted to the 12 complete months. */
      trend: number | null;
      /** Trend projection for the current and next two months. */
      projected: number | null;
      /** Σ(open value × win probability) for deals expected to close that month. */
      expected: number | null;
      isCurrent: boolean;
    }[];
    currentMonth: { label: string; expected: number; pipeline: number; unscored: number };
    nextMonth: { label: string; expected: number; pipeline: number; unscored: number };
    trendSlopePerMonth: number;
  };
  myTasks: {
    id: string;
    title: string;
    dueDate: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    overdue: boolean;
    deal: { id: string; title: string } | null;
    contact: { id: string; firstName: string; lastName: string } | null;
  }[];
  recentActivities: {
    id: string;
    type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
    subject: string;
    occurredAt: string;
    user: { id: string; name: string };
    deal: { id: string; title: string } | null;
    contact: { id: string; firstName: string; lastName: string } | null;
  }[];
}
