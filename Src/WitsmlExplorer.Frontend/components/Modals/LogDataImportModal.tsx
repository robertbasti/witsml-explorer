﻿﻿import { Accordion, Icon, List } from "@equinor/eds-core-react";
import { Button, Tooltip, Typography } from "@mui/material";
import { WITSML_INDEX_TYPE_MD } from "components/Constants";
import {
  ContentTable,
  ContentTableColumn,
  ContentTableRow,
  ContentType
} from "components/ContentViews/table";
import { StyledAccordionHeader } from "components/Modals/LogComparisonModal";
import ModalDialog, { ModalWidth } from "components/Modals/ModalDialog";
import WarningBar from "components/WarningBar";
import { useConnectedServer } from "contexts/connectedServerContext";
import OperationType from "contexts/operationType";
import { parse } from "date-fns";
import { useGetComponents } from "hooks/query/useGetComponents";
import { useOperationState } from "hooks/useOperationState";
import { first } from "lodash";
import { ComponentType } from "models/componentType";
import { IndexRange } from "models/jobs/deleteLogCurveValuesJob";
import ImportLogDataJob from "models/jobs/importLogDataJob";
import ObjectReference from "models/jobs/objectReference";
import LogCurveInfo from "models/logCurveInfo";
import LogObject from "models/logObject";
import { toObjectReference } from "models/objectOnWellbore";
import { array } from "prop-types";
import React, { useCallback, useMemo, useState } from "react";
import JobService, { JobType } from "services/jobService";
import styled from "styled-components";
import {
  extractLASSection,
  parseLASData,
  parseLASHeader
} from "tools/lasFileTools";

export interface LogDataImportModalProps {
  targetLog: LogObject;
}
interface ImportColumn {
  index: number;
  name: string;
  unit: string;
}

interface ContentTableCustomRow extends ContentTableRow {
  [key: string]: any;
}

const IMPORT_FORMAT_INVALID =
  "Can't recognize every column, the csv format may be invalid.";
const MISSING_INDEX_CURVE =
  "The target index curve needs to be present in the csv";
const UNITLESS_UNIT = "unitless";

const LogDataImportModal = (
  props: LogDataImportModalProps
): React.ReactElement => {
  const { targetLog } = props;
  const { connectedServer } = useConnectedServer();
  const {
    dispatchOperation,
    operationState: { colors }
  } = useOperationState();
  const { components: logCurveInfoList, isFetching: isFetchingLogCurveInfo } =
    useGetComponents(
      connectedServer,
      targetLog.wellUid,
      targetLog.wellboreUid,
      targetLog.uid,
      ComponentType.Mnemonic
    );
  const [uploadedFile, setUploadedFile] = useState<File>(null);
  const [uploadedFileData, setUploadedFileData] = useState<string[]>([]);
  const [uploadedFileColumns, setUploadedFileColumns] = useState<
    ImportColumn[]
  >([]);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const separator = ",";
  const hasOverlap = checkOverlap(
    targetLog,
    uploadedFileColumns,
    uploadedFileData,
    logCurveInfoList
  );

  const validate = (fileColumns: ImportColumn[]) => {
    setError("");
    if (fileColumns.length) {
      if (fileColumns.map((col) => col.name).some((value) => value === ""))
        setError(IMPORT_FORMAT_INVALID);
      if (!fileColumns.map((col) => col.name).includes(targetLog.indexCurve))
        setError(MISSING_INDEX_CURVE);
    }
  };

  const onSubmit = async () => {
    setIsLoading(true);

    const logReference: ObjectReference = toObjectReference(targetLog);
    const job: ImportLogDataJob = {
      targetLog: logReference,
      mnemonics: uploadedFileColumns.map((col) => col.name),
      units: uploadedFileColumns.map((col) => col.unit),
      dataRows: uploadedFileData.map((line) => line.split(separator))
    };

    await JobService.orderJob(JobType.ImportLogData, job);
    setIsLoading(false);
    dispatchOperation({ type: OperationType.HideModal });
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files.item(0);
      if (!file) return;
      const text = await file.text();

      let header: ImportColumn[] = null;
      let data: string[] = null;

      if (text.startsWith("~V")) {
        // LAS files should start with ~V.
        const curveSection = extractLASSection(
          text,
          "CURVE INFORMATION",
          "Curve"
        );
        const dataSection = extractLASSection(text, "ASCII", "A");
        header = parseLASHeader(curveSection);
        data = parseLASData(dataSection);
      } else {
        const headerLine = text.split("\n", 1)[0];
        header = parseCSVHeader(headerLine);
        data = text.split("\n").slice(1);
      }

      const indexCurve = targetLog.indexCurve;
      const selectedColumn = header.find(x => x.name.toUpperCase() === indexCurve.toUpperCase()).index;
     
    var  datab = convertToDateTime(data, selectedColumn)
      const validateDateTimeColumn = parseDateTimeColumn(data, selectedColumn);

      var datac = swapFirsColumn(datab,selectedColumn);
     
  const firstColumn = header[selectedColumn];
  header[selectedColumn] = header[0];
 header[0] = firstColumn;
  validate(header);
  
 // console.log(header)
 // console.log(datac)
      setUploadedFile(file);
      setUploadedFileColumns(header);
      setUploadedFileData(datac);
    },
    []
  );

  const parseCSVHeader = (header: string) => {
    const unitRegex = /(?<=\[)(.*)(?=\]){1}/;
    const fileColumns = header.split(separator).map((col, index) => {
      const columnName = col.substring(0, col.indexOf("["));
      return {
        index: index,
        name: columnName ? columnName : col,
        unit: unitRegex.exec(col) ? unitRegex.exec(col)[0] : UNITLESS_UNIT
      };
    });
    return fileColumns;
  };

  const contentTableColumns: ContentTableColumn[] = useMemo(
    () =>
      uploadedFileColumns.map((col) => ({
        property: col.name,
        label: `${col.name}[${col.unit}]`,
        type: ContentType.String
      })),
    [uploadedFileColumns]
  );
  

  const parseDateTimeColumn = (data: string[], selectedColumn: number) => {
    const curveData = data
    .map((obj) => obj.split(",")[selectedColumn]);
    const validate = curveData.map((data) => parsingDateTime(data))
    return validate.every((element) => element === true);
  };

  const convertToDateTime = (data: string[], selectedColumn: number) => {
    const curveData = data
    .map((obj) => obj.split(","));
   
    const parsedDate = curveData.map((datax) => parsingDateTime2(datax[selectedColumn]).toString())
    
    
    curveData[selectedColumn] = parsedDate;
    console.log(curveData)
    const result = curveData
    .map((obj) => obj.join(","));
    
    return result;
  };

  const swapFirsColumn = (data: string[], selectedColumn: number) => {
    const splitData =data
    .map((obj) => obj.split(","));   
    const tempData = swapColumns(splitData, 0, selectedColumn);
   
    const result = tempData
    .map((obj) => obj.join(","));
    return result;
  };

  function swapColumns(matrix: string[][], col1: number, col2: number): string[][] {
    for (const row of matrix) {
        [row[col1], row[col2]] = [row[col2], row[col1]];
    }
    return matrix;
}

  const parsingDateTime =  (dateString: string) => {
    if (isNaN(Date.parse(dateString))) 
    {
      return parse(dateString, "HH:m:ss/dd-MMM-yyyy", new Date()).toString() === "Invalid Date" ? false : true;
    } else
    return true
  }; 

  const parsingDateTime2 =  (dateString: string) => {
    
      var d = parse(dateString, "HH:m:ss/dd-MMM-yyyy", new Date());
      
      const datering = d.toISOString();
     
      return datering;
  }; 

  return (
    <>
      {
        <ModalDialog
          heading={`Import data into "${targetLog.name}"`}
          content={
            <Container>
              <FileContainer>
                <Button
                  variant="contained"
                  color={"primary"}
                  component="label"
                  startIcon={<Icon name="cloudUpload" />}
                >
                  <Typography noWrap>Upload File</Typography>
                  <input
                    type="file"
                    accept=".csv,text/csv,.las,.txt"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                <Tooltip placement={"top"} title={uploadedFile?.name ?? ""}>
                  <Typography noWrap>
                    {uploadedFile?.name ?? "No file chosen"}
                  </Typography>
                </Tooltip>
              </FileContainer>
              <Accordion>
                <Accordion.Item>
                  <StyledAccordionHeader colors={colors}>
                    Limitations
                  </StyledAccordionHeader>
                  <Accordion.Panel
                    style={{ backgroundColor: colors.ui.backgroundLight }}
                  >
                    <List>
                      <List.Item>Supported filetypes: csv, las.</List.Item>
                      <List.Item>
                        Currently, only double values are supported as
                        TypeLogData.
                      </List.Item>
                      <List.Item>
                        The csv is expected to have this format:
                        <List>
                          <List.Item>
                            IndexCurve[unit],Curve1[unit],Curve2[unit]
                            <br />
                            195.99,,2500
                            <br />
                            196.00,1,2501
                          </List.Item>
                        </List>
                      </List.Item>
                      <List.Item>
                        The las is expected to have these sections:
                        <List>
                          <List.Item>
                            ~CURVE INFORMATION
                            <br />
                            [...]
                            <br />
                            IndexCurve .unit [...]
                            <br />
                            Curve1 .unit [...]
                            <br />
                            [...]
                            <br />
                            ~A (or ~ASCII)
                            <br />
                            195.99 -999.25 2500
                            <br />
                            196.00 1 2501
                          </List.Item>
                        </List>
                      </List.Item>
                    </List>
                  </Accordion.Panel>
                </Accordion.Item>
                {uploadedFileColumns?.length &&
                  uploadedFileData?.length &&
                  targetLog?.indexCurve &&
                  !error && (
                    <Accordion.Item>
                      <StyledAccordionHeader colors={colors}>
                        Preview
                      </StyledAccordionHeader>
                      <Accordion.Panel
                        style={{
                          backgroundColor: colors.ui.backgroundLight,
                          padding: 0
                        }}
                      >
                        <ContentTable
                          showPanel={false}
                          columns={contentTableColumns}
                          data={getTableData(
                            uploadedFileData,
                            uploadedFileColumns,
                            targetLog.indexCurve
                          )}
                        />
                      </Accordion.Panel>
                    </Accordion.Item>
                  )}
              </Accordion>
              {hasOverlap && (
                <WarningBar message="The import data overlaps existing data. Any overlap will be overwritten!" />
              )}
            </Container>
          }
          width={ModalWidth.LARGE}
          confirmDisabled={!uploadedFile || !!error || isFetchingLogCurveInfo}
          confirmText={"Import"}
          onSubmit={() => onSubmit()}
          isLoading={isLoading}
          errorMessage={error}
        />
      }
    </>
  );
};

const FileContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;
  .MuiButton-root {
    min-width: 160px;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const checkOverlap = (
  targetLog: LogObject,
  uploadedFileColumns: ImportColumn[],
  uploadedFileData: string[],
  logCurveInfoList: LogCurveInfo[]
) => {
  if (!uploadedFileColumns || !uploadedFileData || !logCurveInfoList)
    return false;
  const importDataRanges = getDataRanges(
    targetLog,
    uploadedFileColumns,
    uploadedFileData
  );

  for (let index = 1; index < uploadedFileColumns.length; index++) {
    const mnemonic = uploadedFileColumns[index].name;
    const logCurveInfo = logCurveInfoList.find(
      (lci) => lci.mnemonic === mnemonic
    );
    const importDataRange = importDataRanges[index];
    if (logCurveInfo && importDataRange.startIndex) {
      if (targetLog.indexType === WITSML_INDEX_TYPE_MD) {
        if (
          Math.max(
            parseFloat(importDataRange.startIndex),
            parseFloat(logCurveInfo.minDepthIndex)
          ) <=
          Math.min(
            parseFloat(importDataRange.endIndex),
            parseFloat(logCurveInfo.maxDepthIndex)
          )
        ) {
          return true;
        }
      } else {
        if (
          Math.max(
            new Date(importDataRange.startIndex).valueOf(),
            new Date(logCurveInfo.minDateTimeIndex).valueOf()
          ) <=
          Math.min(
            new Date(importDataRange.endIndex).valueOf(),
            new Date(logCurveInfo.maxDateTimeIndex).valueOf()
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

const getDataRanges = (
  targetLog: LogObject,
  uploadedFileColumns: ImportColumn[],
  uploadedFileData: string[]
): IndexRange[] => {
  const dataRanges: IndexRange[] = [];

  for (let index = 0; index < uploadedFileColumns.length; index++) {
    const firstRowWithData = uploadedFileData.find((dataRow) => {
      const data = dataRow.split(",")[index];
      if (data) return true;
    });

    const lastRowWithData = uploadedFileData.findLast((dataRow) => {
      const data = dataRow.split(",")[index];
      if (data) return true;
    });

    const firstRowWithDataIndex = firstRowWithData?.split(",")[0];
    const lastRowWithDataIndex = lastRowWithData?.split(",")[0];

    if (
      targetLog.indexType === WITSML_INDEX_TYPE_MD &&
      parseFloat(firstRowWithDataIndex) > parseFloat(lastRowWithDataIndex)
    ) {
      dataRanges.push({
        startIndex: lastRowWithDataIndex,
        endIndex: firstRowWithDataIndex
      });
    } else {
      dataRanges.push({
        startIndex: firstRowWithDataIndex,
        endIndex: lastRowWithDataIndex
      });
    }
  }

  return dataRanges;
};

const getTableData = (
  data: string[],
  columns: ImportColumn[],
  indexCurve: string
): ContentTableCustomRow[] => {
  const indexCurveColumn = columns.find((col) => col.name === indexCurve);
  if (!indexCurveColumn) return [];
  return data?.map((dataLine) => {
    const dataCells = dataLine.split(",");
    const result: ContentTableCustomRow = {
      id: dataCells[indexCurveColumn.index]
    };
    columns.forEach((col, i) => {
      result[col.name] = dataCells[i];
    });
    return result;
  });
};

export default LogDataImportModal;