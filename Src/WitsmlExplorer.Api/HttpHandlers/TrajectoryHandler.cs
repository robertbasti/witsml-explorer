using System;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Http;

using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.HttpHandler;

public static class TrajectoryHandler
{
    public static async Task<IResult> GetTrajectories(string wellUid, string wellboreUid, ITrajectoryService trajectoryService)
    {
        return Results.Ok(await trajectoryService.GetTrajectories(wellUid, wellboreUid));
    }
    public static async Task<IResult> GetTrajectory(string wellUid, string wellboreUid, string trajectoryUid, ITrajectoryService trajectoryService)
    {
        return Results.Ok(await trajectoryService.GetTrajectory(wellUid, wellboreUid, trajectoryUid));
    }
    public static async Task<IResult> GetTrajectoryStations(string wellUid, string wellboreUid, string trajectoryUid, ITrajectoryService trajectoryService)
    {
        return Results.Ok(await trajectoryService.GetTrajectoryStations(wellUid, wellboreUid, trajectoryUid));
    }
}