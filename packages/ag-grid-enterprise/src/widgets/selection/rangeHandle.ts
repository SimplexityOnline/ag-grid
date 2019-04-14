import { 
    CellRange,
    RowPositionUtils,
    _ 
} from "ag-grid-community";
import { AbstractSelectionHandle } from "./abstractSelectionHandle";

export class RangeHandle extends AbstractSelectionHandle {

    static TEMPLATE = '<div class="ag-range-handle"></div>';

    protected type = 'range';

    constructor() {
        super(RangeHandle.TEMPLATE);
    }

    protected onDrag(e: MouseEvent) {
        const lastCellHovered = this.getLastCellHovered();

        if (!lastCellHovered ) { return; }
        const cellRanges = this.rangeController.getCellRanges();
        const lastRange = _.last(cellRanges) as CellRange;

        const newEndRow = {
            rowIndex: lastCellHovered.rowIndex,
            rowPinned: lastCellHovered.rowPinned,
        };

        const rowChanged = !RowPositionUtils.sameRow(newEndRow, lastRange.endRow);

        if (cellRanges.length === 2 && rowChanged) {
            this.rangeController.updateRangeEnd({
                cellRange: cellRanges[0],
                cellPosition: {
                    ...newEndRow,
                    column: cellRanges[0].columns[0]
                }
            })
        }
            
        this.rangeController.extendLatestRangeToCell({
            ...newEndRow,
            column: lastCellHovered.column
        });
    }

    protected onDragEnd(e: MouseEvent) {
        
    }
}