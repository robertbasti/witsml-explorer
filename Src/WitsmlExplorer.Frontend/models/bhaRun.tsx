import Wellbore from "./wellbore";
import CommonData from "./commonData";
import Measure from "./measure";

export default interface BhaRun {
  wellName: unknown;
  type: any;
  category: any;
  subCategory: any;
  extendCategory: any;
  affectedPersonnel: any;
  dTimEnd: any;
  mdBitStart: any;
  mdBitEnd: any;
  severityLevel: any;
  probabilityLevel: any;
  summary: any;
  details: any;
  uid: string;
  wellUid: string;
  wellboreUid: string;
  wellboreName: string;
  name: string;
  numStringRun: string;
  tubular: string;
  tubularUidRef: string;
  dTimStart: Date;
  dTimStop: Date;
  dTimStartDrilling: Date;
  dTimStopDrilling: Date;
  planDogleg: Measure;
  actDogleg: Measure;
  actDoglegMx: Measure;
  statusBha: string;
  numBitRun: string;
  reasonTrip: string;
  objectiveBha: string;
  commonData: CommonData;
}

export const getBhaRunProperties = (bhaRun: BhaRun, wellbore: Wellbore): Map<string, string> => {
  return new Map([
    ["Well", wellbore.wellName],
    ["UID Well", bhaRun.wellUid],
    ["Wellbore", wellbore.name],
    ["UID Wellbore", bhaRun.wellboreUid],
    ["BhaRun", bhaRun.name]
  ]);
};
