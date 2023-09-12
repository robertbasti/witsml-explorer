import { DatePicker, FieldSelectedSections, TimePicker } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTime } from "luxon";
import * as React from "react";

export interface DateTimeCustomPickerProps {
  datum: string;
  onRowSelectionChange?: (newValue: string) => void;
  locale: string;
}

type SetSelectedSectionsFunction = (fieldSelectedSections: FieldSelectedSections) => void;

const DateTimeCustomPicker = (props: DateTimeCustomPickerProps): React.ReactElement => {
  const [selectedDateSections, setSelectedDateSections] = React.useState<FieldSelectedSections>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [selectedTimeSections, setSelectedTimeSections] = React.useState<FieldSelectedSections>(null);
  const inputRefTime = React.useRef<HTMLInputElement>(null);

  const OnKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, selectedSections: FieldSelectedSections, setSelectedSections : SetSelectedSectionsFunction ) => {
    if (event.key === "Tab") {
      if (!event.shiftKey) {
        if (selectedSections === null) {
          event.preventDefault();
          setSelectedSections(0);
        } else if (selectedSections as number < 2){          
          event.preventDefault();
          setSelectedSections((selectedSections as number) + 1);
        }
      }
      if (event.shiftKey) {
        if ((selectedSections as number) > 0) {
          event.preventDefault();
          setSelectedSections((selectedSections as number) - 1);
        }
      }
    }
  }

  const OnKeyUp =  (event: React.KeyboardEvent<HTMLDivElement>, selectedSections: FieldSelectedSections, setSelectedSections : SetSelectedSectionsFunction ) => {
    if (event.key === "Tab" && selectedSections === "all") {
      
      if (!event.shiftKey) { 
        event.preventDefault();                  
        setSelectedSections(0);                  
      }
      else {
        event.preventDefault();
        setSelectedSections(2);
        }
      }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale={props.locale}>
      <DatePicker
        value={DateTime.fromISO(props.datum)}
        inputRef={inputRef}
        selectedSections={selectedDateSections}
        onSelectedSectionsChange={setSelectedDateSections}
        onChange={(newValue) => {
          props.onRowSelectionChange(newValue.toString());
          const currentSelectedSection = selectedDateSections;
          setSelectedDateSections(currentSelectedSection);
        }}
        slotProps={{
          textField: {
            size: "small",
            onKeyDown: (event) => OnKeyDown(event, selectedDateSections, setSelectedDateSections),
            onKeyUp: (event) => OnKeyUp(event, selectedDateSections, setSelectedDateSections),
          }
        }}
      />

      <TimePicker
        value={DateTime.fromISO(props.datum)}
        inputRef={inputRefTime}
        format="HH:mm:ss"
        selectedSections={selectedTimeSections}
        onSelectedSectionsChange={setSelectedTimeSections}
        onChange={(newValue) => {
          props.onRowSelectionChange(newValue.toString());
          const currentSelectedSection = selectedTimeSections;
          setSelectedTimeSections(currentSelectedSection);
        }}
        slotProps={{
          textField: {
            size: "small",
            onKeyDown: (event) => OnKeyDown(event, selectedTimeSections, setSelectedTimeSections),
            onKeyUp: (event) => OnKeyUp(event, selectedTimeSections, setSelectedTimeSections),
          }
        }}
      />
    </LocalizationProvider>
  );
};

export default DateTimeCustomPicker;
