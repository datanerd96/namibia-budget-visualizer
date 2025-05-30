import React from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Tooltip as MuiTooltip } from '@mui/material';
import {
  MonetizationOnOutlined as TotalBudgetIcon,
  PieChartOutlineOutlined as OperationalIcon,
  BuildOutlined as DevelopmentIcon,
  AccountBalanceOutlined as DebtIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { KPIData } from '../services/api'; // Assuming api.ts exports this

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string; // e.g., '%', 'NAD'
  icon?: React.ReactElement;
  tooltip?: string;
  loading?: boolean;
  error?: string | null;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, icon, tooltip, loading, error }) => {
  const displayValue = loading ? <CircularProgress size={24} /> : (error || value);
  const titleId = `kpi-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const renderValue = () => {
    if (loading) return <CircularProgress size={24} />;
    if (error) return <Typography variant="h5" color="error">Error</Typography>;
    return (
      <Typography variant="h5" component="p">
        {value}
        {unit && <Typography variant="caption" component="span" sx={{ ml: 0.5 }}>{unit}</Typography>}
      </Typography>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }} role='region' aria-labelledby={titleId}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {icon && React.cloneElement(icon, { sx: { mr: 1, fontSize: '1.8rem', color: 'text.secondary' } })}
        <Typography variant="subtitle1" color="text.secondary" component="h4" id={titleId}>
          {title}
        </Typography>
        {tooltip && (
          <MuiTooltip title={tooltip}>
            <InfoIcon aria-hidden='true' sx={{ ml: 0.5, fontSize: '1rem', color: 'text.disabled', cursor: 'help' }} />
          </MuiTooltip>
        )}
      </Box>
      {renderValue()}
    </Paper>
  );
};

interface KpiCardsContainerProps {
  kpiData: KPIData | null;
  selectedFy?: string; // To display which FY the KPIs are for
  loading?: boolean;
  error?: string | null;
}

const KpiCardsContainer: React.FC<KpiCardsContainerProps> = ({ kpiData, selectedFy, loading, error }) => {
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    // Assuming value is in millions, display as Billions or Millions
    if (Math.abs(value) >= 1000) { // 1000 Million = 1 Billion
        return `${(value / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getUnitForTotalBudget = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'NAD';
    return Math.abs(value) >= 1000 ? 'Billion NAD' : 'Million NAD';
  }

  const kpis: KpiCardProps[] = kpiData ? [
    {
      title: `Total Budget (${selectedFy || 'Latest FY'})`,
      value: formatCurrency(kpiData.total_budget),
      unit: getUnitForTotalBudget(kpiData.total_budget),
      icon: <TotalBudgetIcon />,
      tooltip: 'Total approved budget allocation for the selected fiscal year.',
    },
    {
      title: 'Operational Share',
      value: kpiData.operational_percentage?.toFixed(1) ?? 'N/A',
      unit: '%',
      icon: <OperationalIcon />,
      tooltip: 'Share of the total budget allocated to operational expenditure.',
    },
    {
      title: 'Development Share',
      value: kpiData.development_percentage?.toFixed(1) ?? 'N/A',
      unit: '%',
      icon: <DevelopmentIcon />,
      tooltip: 'Share of the total budget allocated to development projects.',
    },
    {
      title: 'Debt Servicing Share',
      value: kpiData.debt_servicing_percentage?.toFixed(1) ?? 'N/A',
      unit: '%',
      icon: <DebtIcon />,
      tooltip: 'Share of the total budget allocated to debt servicing. (Note: IPPR 2025/26 forecast for debt servicing is ~14.8% of revenue)',
    },
  ] : [ // Default structure for loading/error states for 4 cards
    { title: `Total Budget (${selectedFy || 'Latest FY'})`, value: '', icon: <TotalBudgetIcon /> },
    { title: 'Operational Share', value: '', icon: <OperationalIcon /> },
    { title: 'Development Share', value: '', icon: <DevelopmentIcon /> },
    { title: 'Debt Servicing Share', value: '', icon: <DebtIcon /> },
  ];

  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2}>
        {kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <KpiCard {...kpi} loading={loading} error={error && !kpiData ? 'Failed to load KPI data' : undefined} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default KpiCardsContainer;
