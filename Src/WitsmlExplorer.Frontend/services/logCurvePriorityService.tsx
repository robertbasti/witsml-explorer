import LogCurvePriorites from "models/logCurvePriorities";
import { ApiClient } from "./apiClient";

export default class LogCurvePriorityService {
  public static async getPrioritizedCurves(
    wellUid: string,
    wellboreUid: string,
    abortSignal?: AbortSignal
  ): Promise<LogCurvePriorites> {
    const response = await ApiClient.get(
      `/api/wells/${encodeURIComponent(wellUid)}/wellbores/${encodeURIComponent(
        wellboreUid
      )}/logCurvePriority`,
      abortSignal
    );
    if (response.ok) {
      return response.json();
    } else {
      return null;
    }
  }

  public static async setPrioritizedCurves(
    wellUid: string,
    wellboreUid: string,
    prioritizedCurves: string[],
    prioritizedGlogalCurves: string[],
    abortSignal?: AbortSignal
  ): Promise<LogCurvePriorites> {
    const payload = {
      prioritizedCurves: prioritizedCurves,
      prioritizedGlobalCurves: prioritizedGlogalCurves,
    };
    const response = await ApiClient.post(
      `/api/wells/${encodeURIComponent(wellUid)}/wellbores/${encodeURIComponent(
        wellboreUid
      )}/logCurvePriority`,
      JSON.stringify(payload),
      abortSignal
    );
    if (response.ok) {
      return response.json();
    } else {
      return null;
    }
  }
}
