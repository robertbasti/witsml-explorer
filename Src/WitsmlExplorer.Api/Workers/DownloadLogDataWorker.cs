using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

using WitsmlExplorer.Api.Jobs;
using WitsmlExplorer.Api.Models;
using WitsmlExplorer.Api.Models.Reports;
using WitsmlExplorer.Api.Services;

namespace WitsmlExplorer.Api.Workers;

/// <summary>
/// Worker for downloading log data.
/// </summary>
public class DownloadLogDataWorker : BaseWorker<DownloadLogDataJob>, IWorker
{
    public JobType JobType => JobType.DownloadLogData;
    private readonly ILogObjectService _logObjectService;
    private readonly IWellService _wellService;
    private readonly IWellboreService _wellBoreService;
    private readonly char _newLineCharacter = '\n';
    private readonly char _separator = ',';

    public DownloadLogDataWorker(
            ILogger<DownloadLogDataJob> logger,
            IWitsmlClientProvider witsmlClientProvider,
            ILogObjectService logObjectService,
            IWellService wellService,
            IWellboreService wellBoreService)
            : base(witsmlClientProvider, logger)
    {
        _logObjectService = logObjectService;
        _wellService = wellService;
        _wellBoreService = wellBoreService;
    }
    /// <summary>
    /// Downaloads all log data and generates a report.
    /// </summary>
    /// <param name="job">The job model contains job-specific parameters.</param>
    /// <returns>Task of the workerResult in a report with all log data.</returns>
    public override async Task<(WorkerResult, RefreshAction)> Execute(DownloadLogDataJob job, CancellationToken? cancellationToken = null)
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

        var wellData = await _wellService.GetWell(job.LogReference.WellUid);


        return DownloadLogDataResult(job, logData.Data, logData.CurveSpecifications, wellData);
    }

    private Dictionary<string, int> CalculateColumnLength(
        ICollection<Dictionary<string, LogDataValue>> data, ICollection<CurveSpecification> curveSpecifications)
    {
        var result = new Dictionary<string, int>();
        foreach (var curveSpecification in curveSpecifications)
        {
            var oneColumn = data.Select(row =>

                row.TryGetValue(curveSpecification.Mnemonic, out LogDataValue value)
                    ? value.Value.ToString()!.Length
                    : 0
            ).Max();
            result[curveSpecification.Mnemonic] = (curveSpecification.Mnemonic.Length + curveSpecification.Unit.Length + 3) > oneColumn ? curveSpecification.Mnemonic.Length + curveSpecification.Unit.Length + 3: oneColumn ;
        }
        return result;
    }

    private int CalculateMaxHeaderLength(
        ICollection<CurveSpecification> curveSpecifications)
    {
        var result = 0;
        foreach (var curveSpecification in curveSpecifications)
        {
            if ((curveSpecification.Mnemonic.Length +
                 curveSpecification.Unit.Length) > result)
                result = curveSpecification.Mnemonic.Length +
                         curveSpecification.Unit.Length;
        }
        return result;
    }

    private void WriteLogDefinitionSection(StringWriter writer, ICollection<CurveSpecification> curveSpecifications, int maxColumnLenght)
    {
        writer.WriteLine("~PARAMETER INFORMATION");
        writer.WriteLine("~CURVE INFORMATION");
        var header = new StringBuilder();
        var secondHeader = new StringBuilder();
        CreateHeader(maxColumnLenght, "API CODE", "CURVE DESCRIPTION", header, secondHeader);
        writer.WriteLine(header.ToString());
        writer.WriteLine(secondHeader.ToString());
        int i = 1;
        foreach (var curveSpecification in curveSpecifications)
        {
            var line = new StringBuilder();
            line.Append(curveSpecification.Mnemonic);
            line.Append(new string(' ', maxColumnLenght - curveSpecification.Mnemonic.Length));
            line.Append('.');
            line.Append(curveSpecification.Unit);
            line.Append(new string(' ', maxColumnLenght - curveSpecification.Unit.Length));
            line.Append(new string(' ', maxColumnLenght -1));
            line.Append(": ");
            line.Append(i++);
            line.Append(' ');
            line.Append(curveSpecification.Mnemonic.Replace("_", " "));
            line.Append(" (");
            line.Append(curveSpecification.Unit);
            line.Append(')');
            writer.WriteLine(line.ToString());
        }
    }

    private static void CreateHeader(int maxColumnLenght, string thirdColumn, string fourthColumn, StringBuilder header, StringBuilder secondHeader)
    {
        header.Append("#MNEM");
        secondHeader.Append("#----");
        if (maxColumnLenght > 5)
        {
            header.Append(new string(' ', maxColumnLenght - 5));
            secondHeader.Append(new string(' ', maxColumnLenght - 5));
        }
        header.Append(".UNIT");
        secondHeader.Append(new string('-', 5));
        if (maxColumnLenght > 5)
        {
            header.Append(new string(' ', maxColumnLenght - 5));
            secondHeader.Append(new string(' ', maxColumnLenght - 5));
        }
        header.Append(thirdColumn);
        secondHeader.Append(new string('-', thirdColumn.Length));
        if (maxColumnLenght > thirdColumn.Length)
        {
            header.Append(new string(' ', maxColumnLenght - thirdColumn.Length));
            secondHeader.Append(new string(' ', maxColumnLenght - thirdColumn.Length));
        }
        header.Append(fourthColumn);
        secondHeader.Append(new string('-', fourthColumn.Length));
    }

    private void WriteColumnHeaderSection(StringWriter writer, ICollection<CurveSpecification> curveSpecifications, Dictionary<string, int> maxColumnLenghts)
    {
        writer.WriteLine("#");
        writer.WriteLine(
            "#-----------------------------------------------------------");
        int i = 0;
        var line = new StringBuilder();
        foreach (var curveSpecification in curveSpecifications)
        {
            int emptySpaces = maxColumnLenghts[curveSpecification.Mnemonic] -
                              curveSpecification.Mnemonic.Length -
                              curveSpecification.Unit.Length - 3;
            if (i == 0)
            {
                line.Append("# ");
                if (emptySpaces > 2)
                    line.Append(new string(' ', emptySpaces -2));
            }
            else
            {
                if (emptySpaces > 0)
                    line.Append(new string(' ', emptySpaces));
            }

            line.Append(curveSpecification.Mnemonic);
            line.Append(" (");
            line.Append(curveSpecification.Unit);
            if (i < curveSpecifications.Count)
                line.Append(") ");
            else
            {
                line.Append(')');
            }
            i++;
        }
        writer.WriteLine(line.ToString());
        writer.WriteLine(
            "#-----------------------------------------------------------");
        writer.WriteLine("~A");
    }

    private void WriteWellInformationSection(StringWriter writer, Well well, int maxColumnLength)
    {
        writer.WriteLine("~WELL INFORMATION BLOCK");
        var header = new StringBuilder();
        var secondHeader = new StringBuilder();
        CreateHeader(maxColumnLength, "DATA", "DESCRIPTION OF MNEMONIC", header, secondHeader);
        writer.WriteLine(header.ToString());
        writer.WriteLine(secondHeader.ToString());
        WriteWellParameter(writer, "STRT", "m", "", "START DEPTH", maxColumnLength);
        WriteWellParameter(writer, "STOP", "m", "", "STOP DEPTH", maxColumnLength);
    }

    private void WriteWellParameter(StringWriter writer, string nameOfParemeter, string unit,
        string data, string description, int maxColumnLength)
    {
        var line = new StringBuilder();
        line.Append(nameOfParemeter);
        if (maxColumnLength - nameOfParemeter.Length > 0)
        {
            line.Append(new string(' ', maxColumnLength - nameOfParemeter.Length));
        }
        line.Append('.');
        line.Append(unit);
        if (maxColumnLength - unit.Length - 1 > 0)
        {
            line.Append(new string(' ', maxColumnLength - data.Length - 1));
        }
        line.Append(data);
        if (maxColumnLength - data.Length > 0)
        {
            line.Append(new string(' ', maxColumnLength - data.Length - 1));
        }
        line.Append(':');
        line.Append(description);
        writer.WriteLine(line.ToString());
    }


    private void WriteDataSection(StringWriter writer,
        ICollection<Dictionary<string, LogDataValue>> data, ICollection<CurveSpecification> curveSpecifications, Dictionary<string, int> columnsLength)
    {
        foreach (var row in data)
        {
            var line = new StringBuilder();
            line.Append("  ");
            int i = 0;
            foreach (var curveSpecification in curveSpecifications)
            {
                var cell =  row.TryGetValue(curveSpecification.Mnemonic, out LogDataValue value)
                        ? value.Value.ToString()
                        : string.Empty;

                int length = columnsLength[curveSpecification.Mnemonic] - cell!.Length;
                line.Append(new string(' ', length ));
                line.Append(cell);
                if (i < curveSpecifications.Count -1) line.Append(' ');
                i++;
            }
            writer.WriteLine(line.ToString());
        }
    }


    private (WorkerResult, RefreshAction) DownloadLogDataResult(DownloadLogDataJob job, ICollection<Dictionary<string, LogDataValue>> reportItems, ICollection<CurveSpecification> curveSpecifications, Well well)
    {
        Logger.LogInformation("Download of all data is done. {jobDescription}", job.Description());
        var reportHeader = GetReportHeader(curveSpecifications);
        var reportBody = GetReportBody(reportItems, curveSpecifications);

        var columnLengths = CalculateColumnLength(reportItems,
            curveSpecifications);
        var maxHeaderLength =
            CalculateMaxHeaderLength(curveSpecifications);
        using (StringWriter writer = new StringWriter())
        {
            // Write the version information
            writer.WriteLine("~Version Information");


            WriteWellInformationSection(writer, well, maxHeaderLength);

            WriteLogDefinitionSection(writer, curveSpecifications, maxHeaderLength);

            WriteColumnHeaderSection(writer, curveSpecifications, columnLengths);

        WriteDataSection(writer, reportItems, curveSpecifications, columnLengths );

        job.JobInfo.Report = DownloadLogDataReport(reportItems, job.LogReference, reportHeader, writer.ToString());
        WorkerResult workerResult = new(GetTargetWitsmlClientOrThrow().GetServerHostname(), true, $"Download of all data is ready, jobId: ", jobId: job.JobInfo.Id);
        return (workerResult, null);
        }
    }

    private DownloadLogDataReport DownloadLogDataReport(ICollection<Dictionary<string, LogDataValue>> reportItems, LogObject logReference, string reportHeader, string reportBody)
    {
        return new DownloadLogDataReport
        {
            Title = $"{logReference.WellboreName} - {logReference.Name}",
            Summary = "You can download the report as csv file",
            LogReference = logReference,
            ReportItems = reportItems,
            DownloadImmediately = true,
            ReportHeader = reportHeader,
            ReportBody = reportBody,
            FileExtension = ".las"
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
