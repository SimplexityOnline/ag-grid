import {
    _,
    Autowired,
    IGetRowsParams,
    NumberSequence,
    PostConstruct,
    PreDestroy,
    RowNode,
    RowNodeBlock,
    RowRenderer,
    LoadSuccessParams
} from "@ag-grid-community/core";
import { InfiniteCache, InfiniteCacheParams } from "./infiniteCache";

export class InfiniteBlock extends RowNodeBlock {

    @Autowired('rowRenderer') private rowRenderer: RowRenderer;

    private startRow: number;
    private endRow: number;
    private readonly parentCache: InfiniteCache;

    private params: InfiniteCacheParams;

    private lastAccessed: number;

    public rowNodes: RowNode[];

    constructor(id: number, parentCache: InfiniteCache, params: InfiniteCacheParams, startRow: number) {
        super(id);
        this.parentCache = parentCache;
        this.params = params;
        // we don't need to calculate these now, as the inputs don't change,
        // however it makes the code easier to read if we work them out up front
        this.startRow = startRow;
        this.endRow = this.startRow + params.blockSize!;
    }

    @PostConstruct
    protected postConstruct(): void {
        this.createRowNodes();
    }

    public getBlockStateJson(): {id: string, state: any} {
        return {
            id: '' + this.getId(),
            state: {
                blockNumber: this.getId(),
                startRow: this.getStartRow(),
                endRow: this.getEndRow(),
                pageStatus: this.getState()
            }
        };
    }

    protected setDataAndId(rowNode: RowNode, data: any, index: number): void {
        if (_.exists(data)) {
            // this means if the user is not providing id's we just use the
            // index for the row. this will allow selection to work (that is based
            // on index) as long user is not inserting or deleting rows,
            // or wanting to keep selection between server side sorting or filtering
            rowNode.setDataAndId(data, index.toString());
        } else {
            rowNode.setDataAndId(undefined, undefined);
        }
    }

    protected loadFromDatasource(): void {
        const params = this.createLoadParams();
        if (_.missing(this.params.datasource.getRows)) {
            console.warn(`AG Grid: datasource is missing getRows method`);
            return;
        }

        // put in timeout, to force result to be async
        window.setTimeout(() => {
            this.params.datasource.getRows(params);
        }, 0);
    }

    protected processServerFail(): void {
        // todo - this method has better handling in SSRM
    }

    protected createLoadParams(): any {
        // PROBLEM . . . . when the user sets sort via colDef.sort, then this code
        // is executing before the sort is set up, so server is not getting the sort
        // model. need to change with regards order - so the server side request is
        // AFTER thus it gets the right sort model.
        const params: IGetRowsParams = {
            startRow: this.getStartRow(),
            endRow: this.getEndRow(),
            successCallback: this.pageLoaded.bind(this, this.getVersion()),
            failCallback: this.pageLoadFailed.bind(this, this.getVersion()),
            sortModel: this.params.sortModel,
            filterModel: this.params.filterModel,
            context: this.gridOptionsWrapper.getContext()
        };
        return params;
    }

    public forEachNode(callback: (rowNode: RowNode, index: number) => void,
                       sequence: NumberSequence,
                       rowCount: number): void {
        this.rowNodes.forEach((rowNode: RowNode, index: number) => {
            const rowIndex = this.startRow + index;
            if (rowIndex < rowCount) {
                callback(rowNode, sequence.next());
            }
        });
    }

    public getLastAccessed(): number {
        return this.lastAccessed;
    }

    public getRow(rowIndex: number, dontTouchLastAccessed = false): RowNode {
        if (!dontTouchLastAccessed) {
            this.lastAccessed = this.params.lastAccessedSequence.next();
        }
        const localIndex = rowIndex - this.startRow;
        return this.rowNodes[localIndex];
    }

    public getStartRow(): number {
        return this.startRow;
    }

    public getEndRow(): number {
        return this.endRow;
    }

    // creates empty row nodes, data is missing as not loaded yet
    protected createRowNodes(): void {
        this.rowNodes = [];
        for (let i = 0; i < this.params.blockSize!; i++) {
            const rowIndex = this.startRow + i;

            const rowNode = this.getContext().createBean(new RowNode());

            rowNode.setRowHeight(this.params.rowHeight);
            rowNode.uiLevel = 0;
            rowNode.setRowIndex(rowIndex);
            rowNode.setRowTop(this.params.rowHeight * rowIndex);

            this.rowNodes.push(rowNode);
        }
    }

    protected processServerResult(params: LoadSuccessParams): void {
        const rowNodesToRefresh: RowNode[] = [];
        const rowCount = params.rowData.length;
        this.endRow = this.startRow + rowCount;
        for (let i = this.params.blockSize!; i < rowCount; i++) {
            const rowIndex = this.startRow + i;
            const rowNode = this.getContext().createBean(new RowNode());
            rowNode.setRowHeight(this.params.rowHeight);
            rowNode.uiLevel = 0;
            rowNode.setRowIndex(rowIndex);
            rowNode.setRowTop(this.params.rowHeight * rowIndex);
            this.rowNodes.push(rowNode);
            console.log(i)
        }
        this.rowNodes.forEach((rowNode: RowNode, index: number) => {
            const data = params.rowData ? params.rowData[index] : undefined;
            if (rowNode.stub) {
                rowNodesToRefresh.push(rowNode);
            }
            this.setDataAndId(rowNode, data, this.startRow + index);
        });

        if (rowNodesToRefresh.length > 0) {
            this.rowRenderer.redrawRows(rowNodesToRefresh);
        }

        const finalRowCount = params.rowCount != null && params.rowCount >= 0 ? params.rowCount : undefined;

        this.parentCache.pageLoaded(this, finalRowCount);
    }

    @PreDestroy
    private destroyRowNodes(): void {
        this.rowNodes.forEach(rowNode => {
            // this is needed, so row render knows to fade out the row, otherwise it
            // sees row top is present, and thinks the row should be shown.
            rowNode.clearRowTopAndRowIndex();
        });
    }
}
