import React from 'react';
import { Box, Container, Typography, AppBar, Toolbar, IconButton, Grid, Paper } from '@mui/material';
import { Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon } from '@mui/icons-material';
import { useAppTheme } from './contexts/AppThemeContext'; // Adjusted import path

// Placeholder components for different sections
const KpiCardsSection: React.FC = () => (
  <Paper elevation={3} sx={{ p: 2, mb: 2, textAlign: 'center' }}>
    <Typography variant=h6>KPI Cards Area</Typography>
    <Typography>Total Budget | Op/Dev Share | Debt Share</Typography>
  </Paper>
);

const ControlsSection: React.FC = () => (
  <Paper elevation={3} sx={{ p: 2, mb: 2, textAlign: 'center' }}>
    <Typography variant=h6>Controls Area</Typography>
    <Typography>Year Picker | Vote/Category Filter | Nominal/Real Toggle | Compare Mode</Typography>
  </Paper>
);

const ChartsSection: React.FC = () => (
  <Grid container spacing={2}>
    <Grid item xs={12} md={6}>
      <Paper elevation={3} sx={{ p: 2, height: 300, textAlign: 'center' }}>
        <Typography>Stacked Bar Chart Area</Typography>
      </Paper>
    </Grid>
    <Grid item xs={12} md={6}>
      <Paper elevation={3} sx={{ p: 2, height: 300, textAlign: 'center' }}>
        <Typography>Line/Area Chart Area</Typography>
      </Paper>
    </Grid>
    <Grid item xs={12}>
      <Paper elevation={3} sx={{ p: 2, height: 400, textAlign: 'center' }}>
        <Typography>Sunburst/Treemap Area</Typography>
      </Paper>
    </Grid>
  </Grid>
);

const TableSection: React.FC = () => (
  <Paper elevation={3} sx={{ p: 2, mt: 2, textAlign: 'center' }}>
    <Typography variant=h6>Data Table Area</Typography>
  </Paper>
);


function AppContent() {
  const { mode, toggleTheme } = useAppTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position=static>
        <Toolbar>
          <Typography variant=h6 component=div sx={{ flexGrow: 1 }}>
            Namibia Budget Visualiser
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color=inherit>
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container component=main sx={{ py: 3, flexGrow: 1 }}>
        {/* Placeholder sections - these will be replaced by actual components */}
        <ControlsSection />
        <KpiCardsSection />
        <ChartsSection />
        <TableSection />
      </Container>
      <Box component=footer sx={{ py: 2, backgroundColor: (theme) => theme.palette.background.paper, textAlign: 'center' }}>
        <Typography variant=body2 color=text.secondary>
          Economic Association of Namibia & IPPR - Budget Visualiser © {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
}

// Main App component that includes the ThemeProvider
function App() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}

export default App;
