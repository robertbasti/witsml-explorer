import {
  EdsProvider,
  Icon,
  Menu,
  TextField,
  Typography
} from "@equinor/eds-core-react";
import { Checkbox } from "@mui/material";
import { Column, Table } from "@tanstack/react-table";
import {
  activeId,
  calculateColumnWidth,
  expanderId,
  selectId
} from "components/ContentViews/table/contentTableUtils";
import {
  ContentTableColumn,
  ContentType
} from "components/ContentViews/table/tableParts";
import { Button } from "components/StyledComponents/Button";
import { UserTheme } from "contexts/operationStateReducer";
import { useLocalStorageState } from "hooks/useLocalStorageState";
import { useOperationState } from "hooks/useOperationState";
import { debounce } from "lodash";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { checkIsUrlTooLong } from "routes/utils/checkIsUrlTooLong";
import styled from "styled-components";
import { Colors } from "styles/Colors";
import {
  STORAGE_CONTENTTABLE_ORDER_KEY,
  removeLocalStorageItem
} from "tools/localStorageHelpers";

const lastId = "dummyLastId";

type FilterValues = Record<string, string>;

export const SettingCustomRanges
 = (props: {
  table: Table<any>;
}): React.ReactElement => {
  const {
    table,
  } = props;
  const {
    operationState: { colors, theme }
  } = useOperationState();
  const [draggedId, setDraggedId] = useState<string | null>();
  const [draggedOverId, setDraggedOverId] = useState<string | null>();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLButtonElement | null>(null);
  const [, saveOrderToStorage] = useLocalStorageState<string[]>(
   STORAGE_CONTENTTABLE_ORDER_KEY
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const isCompactMode = theme === UserTheme.Compact;

  useEffect(() => {
    console.log(" in use effect")
    const filterString = searchParams.get("filter");
    const initialFilter = JSON.parse(filterString);
    const bothEmpty =
      !initialFilter && Object.entries(filterValues).length === 0;
    if (filterString !== JSON.stringify(filterValues) && !bothEmpty) {
      setInitialFilter(initialFilter);
    }
  }, [searchParams]);

  const drop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (
      draggedId != null &&
      draggedOverId != null &&
      draggedId != draggedOverId
    ) {
      const order = table.getAllLeafColumns().map((d) => d.id);
      const dragItemIndex = order.findIndex((value) => value == draggedId);
      order.splice(dragItemIndex, 1);
      if (draggedOverId != lastId) {
        const dragOverItemIndex = order.findIndex(
          (value) => value == draggedOverId
        );
        order.splice(dragOverItemIndex, 0, draggedId);
      } else {
        order.push(draggedId);
      }
      table.setColumnOrder(order);
      saveOrderToStorage(order);
    }
    setDraggedId(null);
    setDraggedOverId(null);
  };

  const onMoveUp = (columnId: string) => {
    const order = table.getAllLeafColumns().map((d) => d.id);
    const index = order.findIndex((value) => value == columnId);
    {
      order[index] = order[index - 1];
      order[index - 1] = columnId;
      table.setColumnOrder(order);
    ;
    }
  };

  const onMoveDown = (columnId: string) => {
    const order = table.getAllLeafColumns().map((d) => d.id);
    const index = order.findIndex((value) => value == columnId);
    if (index < order.length - 1) {
      order[index] = order[index + 1];
      order[index + 1] = columnId;
      table.setColumnOrder(order);
    
    }
  };

  const resizeColumns = () => {
    table.setColumnSizing(
      Object.assign(
        {},
        ...table.getLeafHeaders().map((header) => ({
          [header.id]: calculateColumnWidth(
            header.id,
            isCompactMode,
            (header.column.columnDef.meta as { type: ContentType })?.type
          )
        }))
      )
    );
  };

  const resetFilter = () => {
    table.getAllLeafColumns().map((column) => {
      column.setFilterValue(null);
    });
    setFilterValues({});
    searchParams.delete("filter");
    setSearchParams(searchParams);
  };

  const setInitialFilter = useCallback(
    debounce((filterValues: FilterValues) => {
      // Make sure we remove previous filters
      table.getAllLeafColumns().map((column) => {
        column.setFilterValue(null);
      });
      if (!filterValues) {
        setFilterValues({});
      } else {
        Object.entries(filterValues).forEach(([key, value]) => {
          const column = table
            .getAllLeafColumns()
            .find((col) => col.id === key);
          column.setFilterValue(value);
        });
        setFilterValues(filterValues);
      }
    }, 50),
    []
  );

  const onChangeColumnFilter = (
    e: ChangeEvent<HTMLInputElement>,
    column: Column<any, unknown>
  ) => {
    const newValue = e.target.value || null; // If the value is "", we use null instead. Otherwise, other filter functions will not be applied.
    const newFilterValues = {
      ...filterValues,
      [column.id]: newValue
    };
    if (!newValue) {
      delete newFilterValues[column.id];
    }
    setFilterValues(newFilterValues);
    // Debounce updating the column filter and search params to reduce re-renders
    updateColumnFilter(newValue, column);
    updateFilterSearchParams(newFilterValues);
  };

  const updateColumnFilter = useCallback(
    debounce((value: string, column: Column<any, unknown>) => {
      column.setFilterValue(value);
    }, 500),
    []
  );

  const updateFilterSearchParams = useCallback(
    debounce((filterValues: FilterValues) => {
      const newSearchParams = createColumnFilterSearchParams(
        searchParams,
        filterValues
      );
      if (checkIsUrlTooLong(location.pathname, newSearchParams)) {
        newSearchParams.delete("filter"); // Remove filter from the URL if it takes too much space. The filter will still be applied, but not in the URL.
      }
      setSearchParams(newSearchParams);
    }, 500),
    []
  );

  return (
    <>
    <Button
                  variant={ "ghost"}
                  
                >
                    <Icon name="person" />
              
                </Button>
      <Button
        variant="ghost_icon"
        ref={setMenuAnchor}
        id="anchor-default"
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
        aria-controls="menu-default"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Icon name="filter" />
      </Button>
      <StyledMenu
        open={isMenuOpen}
        id="menu-default"
        aria-labelledby="anchor-default"
        onClose={() => setIsMenuOpen(false)}
        anchorEl={menuAnchor}
        placement="left-end"
        colors={colors}
      >
        <Typography style={{ paddingBottom: "16px" }}>
         
        </Typography>
        <div style={{ display: "flex" }}>
          <Checkbox
            checked={table.getIsAllColumnsVisible()}
            onChange={table.getToggleAllColumnsVisibilityHandler()}
          />
          <Typography
            style={{
              fontFamily: "EquinorMedium",
              fontSize: "0.875rem",
              padding: "0.25rem 0 0 0.25rem"
            }}
          >
            Toggle all over
          </Typography>
        </div>
        {/* set onDragOver and onDrop on an outer div so that the mouse cursor properly detect a drop area, has an annoying flicker tho */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
          }}
          style={{ padding: "0.125rem 0 0.25rem 0" }}
        >
                    
        </div>
                        </StyledMenu>
    </>
  );
};

const OrderingRow = styled.div<{ disableFilters: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.disableFilters ? "20px 25px 25px 1fr" : "20px 25px 25px 1fr 1.5fr"};
  align-items: center;
`;

const OrderingButton = styled(Button)`
  width: 25px;
  height: 25px;
`;

const OrderingLabel = styled(Typography)`
  margin-top: auto;
  margin-bottom: auto;
  margin-right: 1rem;
  cursor: grab;
  font-family: EquinorMedium;
  font-size: 0.875rem;
  white-space: nowrap;
`;

const ResetContainer = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ResetButton = styled(Button)`
  width: 125px;
`;

const StyledMenu = styled(Menu)<{ colors: Colors }>`
  background: ${(props) => props.colors.ui.backgroundLight};
  p {
    color: ${(props) => props.colors.text.staticIconsDefault};
  }
  padding: 0.25rem 0.5rem 0.25rem 0.5rem;
  max-height: 90vh;
  overflow-y: scroll;

  div[class*="InputWrapper__Container"] {
    label.dHhldd {
      color: ${(props) => props.colors.text.staticTextLabel};
    }
  }

  div[class*="Input__Container"][disabled] {
    background: ${(props) => props.colors.text.staticTextFieldDefault};
    border-bottom: 1px solid #9ca6ac;
  }

  div[class*="Input__Container"] {
    background-color: ${(props) => props.colors.text.staticTextFieldDefault};
  }

  input[class*="Input__StyledInput"] {
    padding: 4px;
  }
`;

export const createColumnFilterSearchParams = (
  currentSearchParams: URLSearchParams,
  filterValues: FilterValues
): URLSearchParams => {
  if (Object.entries(filterValues).length === 0) {
    currentSearchParams.delete("filter");
  } else {
    currentSearchParams.set("filter", JSON.stringify(filterValues));
  }
  return currentSearchParams;
};
