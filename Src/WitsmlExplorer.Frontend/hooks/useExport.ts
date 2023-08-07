import { useCallback, useMemo } from "react";

export interface ExportProperties {
  outputMimeType: string;
  fileExtension: string;
  separator: string;
  newLineCharacter: string;
  omitSpecialCharactersFromFilename?: boolean;
  appendDateTime?: boolean;
}

const defaultExportProperties = {
  fileExtension: ".csv",
  newLineCharacter: "\n",
  outputMimeType: "text/csv",
  separator: ",",
  omitSpecialCharactersFromFilename: true,
  appendDateTime: true
};

interface ExportObject {
  exportData: (fileName: string, header: string, data: string) => void;
  exportOptions: ExportProperties;
}
function omitSpecialCharacters(text: string): string {
  return text.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, "_");
}
function appendDateTime(append: boolean): string {
  const now = new Date();
  return append ? `-${now.getFullYear()}-${now.getMonth()}-${now.getDay()}T${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}` : "";
}
function useExport(props?: Partial<ExportProperties>): ExportObject {
  const exportOptions = useMemo(() => ({ ...defaultExportProperties, ...props }), [defaultExportProperties, props]);

  const exportData = useCallback(
    (fileName: string, header: string, data: string) => {
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(
        new Blob([header, exportOptions.newLineCharacter, data], {
          type: exportOptions.outputMimeType
        })
      );
      link.download = exportOptions.omitSpecialCharactersFromFilename
        ? `${omitSpecialCharacters(fileName)}${appendDateTime(exportOptions.appendDateTime)}${exportOptions.fileExtension}`
        : `${fileName}${appendDateTime(exportOptions.appendDateTime)}${exportOptions.fileExtension}`;
      document.body.appendChild(link);
      link.click();
      //we might not need a timeout for clean up
      setTimeout(function () {
        window.URL.revokeObjectURL(link.href);
        link.remove();
      }, 200);
    },
    [exportOptions]
  );

  return useMemo(() => ({ exportData, exportOptions }), [exportData, exportOptions]);
}

export default useExport;
