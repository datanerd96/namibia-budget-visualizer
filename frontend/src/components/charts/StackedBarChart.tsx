import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell, // For custom colors
} from 'recharts';
import { Typography, Paper, useTheme } from '@mui/material';
import { BudgetEntry } from '../../services/api'; // Assuming api.ts exports this

// Define a type for the data expected by this chart component
// This often involves transforming the raw BudgetEntry data
export interface StackedBarChartDataPoint {
  name: string; // e.g., Vote name or FY
  [key: string]: string | number | undefined; // Each stackKey will be a property
}

interface StackedBarChartProps {
  data: StackedBarChartDataPoint[];
  title?: string;
  // mainGroupingKey: string; // The key on data points for X-axis labels (e.g., 'vote')
  stackKeys: string[]; // Keys for the different stacks (e.g., ['Operational', 'Development', 'Statutory'])
  valueKeySuffix?: string; // Suffix for value keys if needed, e.g. '_amount' if keys are 'Operational_amount'
  // Colors for each stack key. If not provided, default Recharts colors will be used.
  colors?: Record<string, string>; // e.g. { 'Operational': '#8884d8', 'Development': '#82ca9d' }
  // Custom XAxis dataKey, defaults to 'name'
  xAxisDataKey?: string;
}

// Helper to format ticks or tooltip values (e.g., to billions)
const formatValue = (value: number): string => {
  if (value >= 1000000000) { // One Billion
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) { // One Million
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) { // One Thousand
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  title,
  stackKeys,
  // colors, // Will use theme colors for now
  xAxisDataKey = 'name',
}) => {
  const theme = useTheme();

  // Define colors based on theme - can be expanded
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success?.main || '#4caf50',
    theme.palette.warning?.main || '#ff9800',
    theme.palette.info?.main || '#2196f3',
    theme.palette.error?.main || '#f44336',
    // Add more if needed
    '#FFBB28', '#FF8042', '#00C49F', '#0088FE', '#AF19FF',
  ];

  // Assign colors to stack keys
  const stackColors: Record<string, string> = stackKeys.reduce((acc, key, index) => {
    acc[key] = defaultColors[index % defaultColors.length];
    return acc;
  }, {} as Record<string, string>);


  if (!data || data.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6" gutterBottom>{title || 'Stacked Bar Chart'}</Typography>
        <Typography variant="body1">No data available to display.</Typography>
      </Paper>
    );
  }

  // Ensure all stackKeys are present in each data point, defaulting to 0 if not.
  // This is important for Recharts to render stacks correctly.
  const processedData = data.map(d => {
    const point: StackedBarChartDataPoint = { ...d };
    stackKeys.forEach(key => {
      if (point[key] === undefined || point[key] === null) {
        point[key] = 0; // Default to 0 for missing stack values
      }
    });
    return point;
  });


  return (
    <Paper elevation={3} sx={{ p: 2, height: { xs: 300, sm: 400, md: 500 } }} aria-label={title || 'Stacked bar chart'}>
      {title && <Typography variant="h6" component="h3" gutterBottom sx={{ textAlign: 'center' }}>{title}</Typography>}
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          // barCategoryGap: '20%' // Adjust gap between bars if needed
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisDataKey} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) => [formatValue(value), name]}
            labelStyle={{ fontWeight: 'bold' }}
            itemStyle={{ textTransform: 'capitalize' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => value.replace(/_/g, ' ')} />
          {stackKeys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="a" name={key.replace(/_/g, ' ')} fill={stackColors[key] || defaultColors[index % defaultColors.length]}>
              {/* You could add individual Cell components here if you need per-bar segment customization beyond fill */}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default StackedBarChart;

// Example of how to transform BudgetEntry[] to StackedBarChartDataPoint[]
// This would typically live in a hook or parent component that prepares data for the chart.
export const transformBudgetDataForStackedBar = (
  budgetData: BudgetEntry[],
  mainGroupingKey: keyof BudgetEntry = 'vote', // e.g., 'vote' for X-axis
  stackingKey: keyof BudgetEntry = 'category'  // e.g., 'category' for stacks
): StackedBarChartDataPoint[] => {
  if (!budgetData || budgetData.length === 0) return [];

  const groupedData: Record<string, Record<string, number>> = {};

  budgetData.forEach(entry => {
    const groupName = entry[mainGroupingKey] as string;
    const stackName = entry[stackingKey] as string;
    const amount = entry.amount_nad_millions;

    if (!groupName || !stackName) return; // Skip if essential keys are missing

    if (!groupedData[groupName]) {
      groupedData[groupName] = {};
    }
    groupedData[groupName][stackName] = (groupedData[groupName][stackName] || 0) + amount;
  });

  return Object.keys(groupedData).map(groupName => {
    const dataPoint: StackedBarChartDataPoint = { name: groupName };
    Object.keys(groupedData[groupName]).forEach(stackName => {
      dataPoint[stackName] = groupedData[groupName][stackName];
    });
    return dataPoint;
  });
};
