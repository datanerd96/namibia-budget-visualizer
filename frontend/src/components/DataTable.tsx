import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Typography,
  Box,
  Button,
  Tooltip as MuiTooltip, // Renamed to avoid conflict with Recharts Tooltip if used in same scope elsewhere
  IconButton,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx'; // SheetJS
import { BudgetEntry } from '../services/api'; // Assuming api.ts exports this

// Column definition type
export interface ColumnDefinition<T> {
  id: keyof T | string; // Allow string for custom/derived columns
  label: string;
  numeric?: boolean;
  minWidth?: number;
  disableSort?: boolean;
  // Optional custom render function for a cell
  render?: (value: any, row: T) => React.ReactNode;
  // Optional value getter if 'id' is not a direct key or needs transformation for display/sort
  valueGetter?: (row: T) => string | number | null | undefined;
}

type Order = 'asc' | 'desc';

interface DataTableProps<T extends object> {
  data: T[];
  columns: ColumnDefinition<T>[];
  title?: string;
  defaultSortBy?: keyof T | string;
  defaultSortOrder?: Order;
  rowsPerPageOptions?: number[];
  // Enable a sticky header for scrolling large tables
  stickyHeader?: boolean;
  // Max height for the table container when stickyHeader is true
  maxHeight?: string | number;
}

// Helper for stable sorting
function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1]; // Stabilize by original index
  });
  return stabilizedThis.map((el) => el[0]);
}

// Default comparator
function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
  columns: ColumnDefinition<any>[],
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
  const columnDef = columns.find(c => c.id === orderBy);

  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy, columnDef)
    : (a, b) => -descendingComparator(a, b, orderBy, columnDef);
}

function descendingComparator<T>(
  a: T,
  b: T,
  orderBy: keyof T,
  columnDef?: ColumnDefinition<T>
) {
  let valA = columnDef?.valueGetter ? columnDef.valueGetter(a) : a[orderBy];
  let valB = columnDef?.valueGetter ? columnDef.valueGetter(b) : b[orderBy];

  // Ensure consistent comparison for null/undefined values (treat them as smaller)
  if (valA == null && valB != null) return -1;
  if (valA != null && valB == null) return 1;
  if (valA == null && valB == null) return 0;

  // If values are numbers, compare as numbers
  if (typeof valA === 'number' && typeof valB === 'number') {
    return valB < valA ? -1 : (valB > valA ? 1 : 0);
  }
  // If values are strings, compare as strings (case-insensitive)
  if (typeof valA === 'string' && typeof valB === 'string') {
    return valB.toLowerCase() < valA.toLowerCase() ? -1 : (valB.toLowerCase() > valA.toLowerCase() ? 1 : 0);
  }

  // Fallback for other types (though explicit handling is better)
  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}


const DataTable = <T extends object>({
  data,
  columns,
  title = 'Data Table',
  defaultSortBy,
  defaultSortOrder = 'asc',
  rowsPerPageOptions = [10, 25, 50, 100],
  stickyHeader = true,
  maxHeight = 450,
}: DataTableProps<T>) => {
  const [order, setOrder] = useState<Order>(defaultSortOrder);
  // Ensure defaultSortBy is a valid key from columns or fallback
  const initialSortBy = defaultSortBy || (columns.length > 0 ? columns[0].id : '');
  const [orderBy, setOrderBy] = useState<keyof T | string>(initialSortBy as keyof T | string);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0] || 10);

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof T | string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return data; // No sorting if orderBy is not set
    return stableSort(data, getComparator(order, orderBy as keyof T, columns));
  }, [data, order, orderBy, columns]);

  const paginatedData = useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const exportToCSV = useCallback(() => {
    // Use all data (sorted) for export, not just paginated view
    const csvData = sortedData.map(row =>
      columns.map(col => {
        if (col.render) { // If a renderer exists, try to get a simple value
          const rendered = col.render(col.valueGetter ? col.valueGetter(row) : (row as any)[col.id], row);
          if (typeof rendered === 'string' || typeof rendered === 'number') return rendered;
          return JSON.stringify((row as any)[col.id]); // Fallback for complex rendered content
        }
        return col.valueGetter ? col.valueGetter(row) : (row as any)[col.id];
      }).join(',')
    );
    const csvContent = [columns.map(col => col.label).join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${title.replace(/\s+/g, '_').toLowerCase()}_export.csv`);
  }, [sortedData, columns, title]);

  const exportToXLSX = useCallback(() => {
    // Use all data (sorted) for export
    const worksheetData = sortedData.map(row => {
      const newRow: any = {};
      columns.forEach(col => {
        let value;
        if (col.render) {
          const rendered = col.render(col.valueGetter ? col.valueGetter(row) : (row as any)[col.id], row);
          value = (typeof rendered === 'string' || typeof rendered === 'number') ? rendered : (row as any)[col.id];
        } else {
          value = col.valueGetter ? col.valueGetter(row) : (row as any)[col.id];
        }
        newRow[col.label] = value; // Use column label as header in Excel
      });
      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_').toLowerCase()}_export.xlsx`);
  }, [sortedData, columns, title]);

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography>No data available.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h3">{title}</Typography>
        <Box>
          <MuiTooltip title="Export as CSV">
            <IconButton onClick={exportToCSV} color="primary" aria-label='Export table data to CSV'>
              <FileDownloadIcon />
              <Typography variant="caption" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>CSV</Typography>
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Export as XLSX">
            <IconButton onClick={exportToXLSX} color="primary" aria-label='Export table data to XLSX'>
              <FileDownloadIcon />
              <Typography variant="caption" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>XLSX</Typography>
            </IconButton>
          </MuiTooltip>
        </Box>
      </Box>
      <TableContainer sx={{ maxHeight: stickyHeader ? maxHeight : undefined }}>
        <Table stickyHeader={stickyHeader} aria-label={title || 'data table'}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id.toString()}
                  align={column.numeric ? 'right' : 'left'}
                  padding={'normal'}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {!column.disableSort ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={(event) => handleRequestSort(event, column.id as keyof T)}
                    >
                      {column.label}
                      {orderBy === column.id ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow hover role="checkbox" tabIndex={-1} key={}>
                {columns.map((column) => {
                  const value = column.valueGetter ? column.valueGetter(row) : (row as any)[column.id];
                  return (
                    <TableCell key={column.id.toString()} align={column.numeric ? 'right' : 'left'}>
                      {column.render ? column.render(value, row) : (value ?? 'N/A')}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
             {paginatedData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                        No results found for current filters.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={data.length} // Total number of rows (unpaginated)
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default DataTable;

// Example Column Definitions for BudgetEntry data
export const budgetEntryColumns: ColumnDefinition<BudgetEntry>[] = [
  { id: 'fy', label: 'Fiscal Year', minWidth: 100 },
  { id: 'vote', label: 'Vote (Ministry/Sector)', minWidth: 200 },
  { id: 'category', label: 'Category', minWidth: 150 },
  { id: 'sub_category', label: 'Sub-Category', minWidth: 170, render: (value) => value || '-' },
  {
    id: 'amount_nad_millions',
    label: 'Amount (NAD Millions)',
    minWidth: 170,
    numeric: true,
    render: (value) => typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'
  },
];
