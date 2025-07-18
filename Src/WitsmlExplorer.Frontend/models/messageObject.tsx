import CommonData from "models/commonData";
import ObjectOnWellbore from "models/objectOnWellbore";
import MeasureWithDatum from "./measureWithDatum";

export default interface MessageObject extends ObjectOnWellbore {
  messageText: string;
  dTim: string;
  typeMessage: string;
  commonData: CommonData;
  md: MeasureWithDatum;
}
