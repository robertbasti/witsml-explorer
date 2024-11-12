export default interface BaseReport {
  title: string;
  summary: string;
  reportItems: any[];
  warningMessage?: string;
  downloadImmediately?: boolean;
  reportHeader?: string;
  jobDetails?: string;
  reportBody?: string;
  fileExtension?: string;
}

export const createReport = (
  title = "",
  summary = "",
  reportItems: any[] = [],
  warningMessage: string = null,
  downloadImmediately: boolean = null,
  reportHeader: string = null,
  jobDetails: string = null,
  reportBody: string = null,
  fileExtension: string = null,
): BaseReport => {
  return {
    title,
    summary,
    reportItems,
    warningMessage,
    downloadImmediately,
    reportHeader,
    jobDetails,
    reportBody,
    fileExtension
  };
};
