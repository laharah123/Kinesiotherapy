import { useEffect } from 'react';

import { useAuthStore } from '@/lib/store/auth';
import { useIntakeStore } from '@/lib/store/intake';
import { loadActivePlan, savePlanWithSchedule } from '@/lib/plans/api';
import { localDateString } from '@/lib/plans/dates';

/**
 * Keeps the local plan and Supabase in step, from the Home screen.
 *
 * Two directions, both best effort so the app keeps working offline:
 *  - no local plan but a signed-in user: pull the active plan and its schedule;
 *  - a local plan that was never saved (`activePlanId` is null): push it, which
 *    is how a plan built while offline eventually reaches the server.
 */
export function usePlanSync(): void {
  const userId        = useAuthStore((s) => s.user?.id ?? null);
  const generatedPlan = useIntakeStore((s) => s.generatedPlan);
  const activePlanId  = useIntakeStore((s) => s.activePlanId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function sync(id: string) {
      const store = useIntakeStore.getState();

      if (!store.generatedPlan) {
        try {
          const loaded = await loadActivePlan(id);
          if (!cancelled && loaded) useIntakeStore.getState().hydrateFromRemote(loaded);
        } catch {
          // Offline or not configured: nothing to hydrate.
        }
        return;
      }

      if (!store.activePlanId) {
        try {
          const planId = await savePlanWithSchedule(id, store.generatedPlan);
          if (cancelled) return;
          const current = useIntakeStore.getState();
          current.setActivePlanId(planId);
          if (!current.planStartedAt) current.setPlanStartedAt(localDateString());
        } catch {
          // Retry on the next mount; the plan lives locally meanwhile.
        }
      }
    }

    void sync(userId);
    return () => { cancelled = true; };
  }, [userId, generatedPlan, activePlanId]);
}
