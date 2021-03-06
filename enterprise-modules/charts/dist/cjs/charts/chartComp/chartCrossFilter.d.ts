import { BeanStub } from "@ag-grid-community/core";
export declare class ChartCrossFilter extends BeanStub {
    private readonly gridApi;
    private readonly columnController;
    filter(event: any, reset?: boolean): void;
    private resetFilters;
    private updateFilters;
    private getUpdatedFilterModel;
    private getCurrentGridValuesForCategory;
    private static extractFilterColId;
    private isValidColumnFilter;
    private getColumnFilterType;
}
