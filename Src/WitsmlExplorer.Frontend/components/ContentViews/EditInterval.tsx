import { Button, Icon, Label, Typography } from "@equinor/eds-core-react";
import { useContext, useState } from "react";
import styled from "styled-components";
import NavigationContext from "../../contexts/navigationContext";
import NavigationType from "../../contexts/navigationType";
import { colors } from "../../styles/Colors";
import { formatIndexValue } from "../Modals/SelectIndexToDisplayModal";
import DateTimeCustomPicker from ".././DateTimeCustomPicker";

const EditInterval = (): React.ReactElement => {
  const { dispatchNavigation, navigationState } = useContext(NavigationContext);
  const { selectedLogCurveInfo } = navigationState;
  const { minIndex, maxIndex } = selectedLogCurveInfo ? selectedLogCurveInfo[0] : { minIndex: null, maxIndex: null };

  const [startIndex, setStartIndex] = useState(String(minIndex));
  const [endIndex, setEndIndex] = useState(String(maxIndex));
  const [isEdited, setIsEdited] = useState(false);

  const submitEditInterval = () => {
    setIsEdited(false);
    const logCurveInfoWithUpdatedIndex = selectedLogCurveInfo.map((logCurveInfo) => {
      return {
        ...logCurveInfo,
        minIndex: formatIndexValue(startIndex),
        maxIndex: formatIndexValue(endIndex)
      };
    });
    dispatchNavigation({
      type: NavigationType.ShowCurveValues,
      payload: { logCurveInfo: logCurveInfoWithUpdatedIndex }
    });
  };
  return (
    <EditIntervalLayout>
      <Typography
        style={{
          color: `${colors.interactive.primaryResting}`
        }}
        variant="h3"
      >
        Curve Values
      </Typography>
      <StartEndIndex>
        <StyledLabel label="Start Index" />
        <DateTimeCustomPicker
          datum={startIndex}
          onRowSelectionChange={(result) => {
            setStartIndex(result);
            setIsEdited(true);
          }}
          locale="nb"
        />
      </StartEndIndex>
      <StartEndIndex>
        <StyledLabel label="End Index" />
        <DateTimeCustomPicker
          datum={endIndex}
          onRowSelectionChange={(result) => {
            setEndIndex(result);
            setIsEdited(true);
          }}
          locale="nb"
        />
      </StartEndIndex>
      <StyledButton variant={"ghost"} color={"primary"} onClick={submitEditInterval}>
        <Icon size={16} name={isEdited ? "arrowForward" : "sync"} />
      </StyledButton>
    </EditIntervalLayout>
  );
};

const EditIntervalLayout = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const StartEndIndex = styled.div`
  display: flex;
`;

const StyledLabel = styled(Label)`
  width: 5rem;
  align-items: center;
  font-style: italic;
`;

const StyledButton = styled(Button)`
  ${(props) =>
    props.disabled
      ? `
      &:hover{
        border:2px solid ${colors.interactive.disabledBorder};
        border-radius: 50%;
      }
      &&{
        border:2px solid ${colors.interactive.disabledBorder};
      }`
      : `
      &:hover{
        border-radius: 50%;
      }
      &&{
        border:2px solid ${colors.interactive.primaryResting};
      }`}
  display:flex;
  height: 2rem;
  width: 2rem;
  min-height: 2rem;
  min-width: 2rem;
  padding: 0;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
`;
export default EditInterval;
