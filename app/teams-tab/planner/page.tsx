"use client";

import { useEffect } from "react";

const TENANT_ID = "6aba6035-1c5e-466b-8452-befc27dbef82";
const PLAN_ID = "MHAmqUtGjEmRqiigZiInopgAHRFM";

export default function PlannerRedirect() {
  useEffect(() => {
    open();
  }, []);

  async function open() {
    try {
      const { app } = await import("@microsoft/teams-js");
      await app.initialize();
      const context = await app.getContext();
      const userObjectId = context.user?.id ?? "";
      const url =
        `https://tasks.teams.microsoft.com/teamsui/${TENANT_ID}/Home/PlanViews/${PLAN_ID}` +
        `?userObjectId=${userObjectId}&Type=PlanLink&Channel=TeamsTab`;
      await app.openLink(url);
    } catch {
      window.location.href =
        `https://tasks.office.com/${TENANT_ID}/Home/PlanViews/${PLAN_ID}`;
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-iris-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
        <p className="text-sm text-iris-muted">Planner wird geöffnet…</p>
      </div>
    </div>
  );
}
