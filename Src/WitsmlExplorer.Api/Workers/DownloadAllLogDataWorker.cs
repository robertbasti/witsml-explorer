using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using WitsmlExplorer.Api.Jobs;
using WitsmlExplorer.Api.Models;
using WitsmlExplorer.Api.Models.Reports;
using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.Workers;

/// <summary>
/// Worker for downloading all log data.
/// </summary>
public class DownloadAllLogDataWorker : BaseWorker<DownloadAllLogDataJob>, IWorker
{
    public JobType JobType => JobType.DownloadAllLogData;
    private readonly ILogObjectService _logObjectService;
    private readonly char _newLineCharacter = '\n';
    private readonly char _separator = ',';

    public DownloadAllLogDataWorker(
            ILogger<DownloadAllLogDataJob> logger,
            IWitsmlClientProvider witsmlClientProvider,
            ILogObjectService logObjectService)
            : base(witsmlClientProvider, logger)
    {
        _logObjectService = logObjectService;
    }
    /// <summary>
    /// Downaloads all log data and generates a report.
    /// </summary>
    /// <param name="job">The job model contains job-specific parameters.</param>
    /// <returns>Task of the workerResult in a report with all log data.</returns>
    public override async Task<(WorkerResult, RefreshAction)> Execute(DownloadAllLogDataJob job, CancellationToken? cancellationToken = null)
    {
        Logger.LogInformation("Downloading of all data started. {jobDescription}", job.Description());
        IProgress<double> progressReporter = new Progress<double>(progress =>
        {
            job.ProgressReporter?.Report(progress);
            if (job.JobInfo != null) job.JobInfo.Progress = progress;
        });

        if (!string.IsNullOrEmpty(job.StartIndex))
        {
            job.LogReference.StartIndex = job.StartIndex;
        }

        if (!string.IsNullOrEmpty(job.EndIndex))
        {
            job.LogReference.EndIndex = job.EndIndex;
        }

        var logData = await _logObjectService.ReadLogData(job.LogReference.WellUid, job.LogReference.WellboreUid, job.LogReference.Uid, job.Mnemonics.ToList(), job.StartIndexIsInclusive, job.LogReference.StartIndex, job.LogReference.EndIndex, true, cancellationToken, progressReporter);

        return DownloadAllLogDataResult(job, logData.Data, logData.CurveSpecifications);
    }

    private (WorkerResult, RefreshAction) DownloadAllLogDataResult(DownloadAllLogDataJob job, ICollection<Dictionary<string, LogDataValue>> reportItems, ICollection<CurveSpecification> curveSpecifications)
    {
        Logger.LogInformation("Download of all data is done. {jobDescription}", job.Description());
        var reportHeader = GetReportHeader(curveSpecifications);
        var reportBody = GetReportBody(reportItems, curveSpecifications);
        job.JobInfo.Report = DownloadAllLogDataReport(reportItems, job.LogReference, reportHeader, reportBody);
        WorkerResult workerResult = new(GetTargetWitsmlClientOrThrow().GetServerHostname(), true, $"Download of all data is ready, jobId: ", jobId: job.JobInfo.Id);
        return (workerResult, null);
    }

    private DownloadAllLogDataReport DownloadAllLogDataReport(ICollection<Dictionary<string, LogDataValue>> reportItems, LogObject logReference, string reportHeader, string reportBody)
    {
        return new DownloadAllLogDataReport
        {
            Title = $"{logReference.WellboreName} - {logReference.Name}",
            Summary = "You can download the report as csv file",
            LogReference = logReference,
            ReportItems = reportItems,
            DownloadImmediately = true,
            ReportHeader = reportHeader,
            ReportBody = reportBody
        };
    }

    private string GetReportHeader(ICollection<CurveSpecification> curveSpecifications)
    {
        var listOfHeaders = new List<string>();
        foreach (CurveSpecification curveSpec in curveSpecifications)
        {
            listOfHeaders.Add($"{curveSpec.Mnemonic}[{curveSpec.Unit}]");
        }
        return string.Join(',', listOfHeaders);
    }

    private string GetReportBody(ICollection<Dictionary<string, LogDataValue>> reportItems, ICollection<CurveSpecification> curveSpecifications)
    {
        var mnemonics = curveSpecifications.Select(spec => spec.Mnemonic).ToList();
        var body = string.Join(_newLineCharacter,
            reportItems.Select(row =>
                string.Join(_separator, mnemonics.Select(mnemonic =>
                    row.TryGetValue(mnemonic, out LogDataValue value)
                    ? value.Value.ToString()
                    : string.Empty
                ))
            )
        );
        return body;
    }
}
