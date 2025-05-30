import React from 'react';
import {
  LineChart,
  Line,
  AreaChart, // Potentially for one of the series
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label, // For axis labels
} from 'recharts';
import { Typography, Paper, useTheme } from '@mui/material';
import { VoteGrowthData, GrowthDataItem } from '../../services/api'; // Assuming api.ts exports these

interface LineAreaChartProps {
  data?: GrowthDataItem[]; // Expects data for a single vote, over fiscal years
  title?: string;
  xAxisKey?: keyof GrowthDataItem; // e.g., 'fy'
  yAxisLineKey?: keyof GrowthDataItem; // e.g., 'absolute_growth' or 'amount_nad_millions'
  yAxisLineName?: string; // Name for the line series legend
  yAxisAreaKey?: keyof GrowthDataItem; // e.g., 'percentage_growth'
  yAxisAreaName?: string; // Name for the area series legend
  // Optional: if you want to display total amount as a line/area too
  yAxisTotalAmountKey?: keyof GrowthDataItem; // e.g. 'amount_nad_millions'
  yAxisTotalAmountName?: string; // Name for total amount series
}

// Helper to format ticks or tooltip values
const formatNumber = (value: number, type: 'absolute' | 'percentage' | 'amount'): string => {
  if (type === 'percentage') {
    return `${value.toFixed(1)}%`;
  }
  if (type === 'amount' || type === 'absolute') {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  }
  return value.toString();
};

const LineAreaChart: React.FC<LineAreaChartProps> = ({
  data,
  title = 'Year-on-Year Growth',
  xAxisKey = 'fy',
  yAxisLineKey = 'absolute_growth',
  yAxisLineName = 'Absolute Growth (NAD Millions)',
  yAxisAreaKey, // Optional, e.g. 'percentage_growth'
  yAxisAreaName = 'Percentage Growth (%)',
  yAxisTotalAmountKey,
  yAxisTotalAmountName = 'Total Amount (NAD Millions)',
}) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body1">No data available to display for this chart.</Typography>
      </Paper>
    );
  }

  // Determine if dual Y-axis is needed
  const dualYAxis = yAxisLineKey && yAxisAreaKey;

  return (
    <Paper elevation={3} sx={{ p: 2, height: { xs: 300, sm: 400, md: 500 } }} role='figure' aria-label={title}>
      {title && <Typography variant="h6" component="h3" gutterBottom sx={{ textAlign: 'center' }}>{title}</Typography>}
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: yAxisAreaKey ? 40 : 20, // More space if dual Y axis with area
            bottom: 20, // Increased bottom margin for XAxis Label
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }}>
            <Label value="Fiscal Year" offset={-15} position="insideBottom" />
          </XAxis>

          {/* Y-Axis for Line (e.g., Absolute Growth or Total Amount) */}
          <YAxis
            yAxisId="left"
            orientation="left"
            stroke={theme.palette.primary.main}
            tickFormatter={(val) => formatNumber(val, yAxisLineKey === 'percentage_growth' ? 'percentage' : (yAxisLineKey === 'amount_nad_millions' ? 'amount' : 'absolute'))}
            tick={{ fontSize: 12 }}
          >
            <Label
              angle={-90}
              value={yAxisLineName}
              position='insideLeft'
              style={{textAnchor: 'middle', fill: theme.palette.text.primary}}
            />
          </YAxis>

          {/* Optional Second Y-Axis for Area (e.g., Percentage Growth) */}
          {dualYAxis && yAxisAreaKey && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={theme.palette.secondary.main}
              tickFormatter={(val) => formatNumber(val, 'percentage')}
              tick={{ fontSize: 12 }}
            >
              <Label
                angle={90}
                value={yAxisAreaName}
                position='insideRight'
                style={{textAnchor: 'middle', fill: theme.palette.text.primary}}
              />
            </YAxis>
          )}

          <Tooltip
            formatter={(value: number, name: string, props: any) => {
                let type: 'absolute' | 'percentage' | 'amount' = 'amount';
                if (name === yAxisLineName) type = yAxisLineKey === 'percentage_growth' ? 'percentage' : (yAxisLineKey === 'amount_nad_millions' ? 'amount' : 'absolute');
                else if (name === yAxisAreaName) type = 'percentage';
                else if (name === yAxisTotalAmountName) type = 'amount';
                return [formatNumber(value, type), name];
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          {/* Line for Absolute Growth or primary metric */}
          {yAxisLineKey && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={yAxisLineKey}
              name={yAxisLineName}
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}

          {/* Optional Area for Percentage Growth */}
          {yAxisAreaKey && (
             <Area // Using Area for percentage growth, could also be a Line
              yAxisId={dualYAxis ? "right" : "left"} // Use right Y-axis if dual, else left
              type="monotone"
              dataKey={yAxisAreaKey}
              name={yAxisAreaName}
              fill={theme.palette.secondary.light} // Lighter fill for area
              stroke={theme.palette.secondary.main}
              strokeWidth={2}
            />
          )}

          {/* Optional Line for Total Amount */}
          {yAxisTotalAmountKey && yAxisTotalAmountKey !== yAxisLineKey && (
             <Line
              yAxisId="left" // Assuming total amount shares scale with absolute growth or primary Y-axis
              type="monotone"
              dataKey={yAxisTotalAmountKey}
              name={yAxisTotalAmountName}
              stroke={theme.palette.success?.dark || '#388e3c'} // Different color
              strokeDasharray="5 5" // Dashed line to differentiate
              dot={{ r: 3 }}
            />
          )}

        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default LineAreaChart;
