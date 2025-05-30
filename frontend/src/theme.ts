import { createTheme, PaletteMode } from '@mui/material';

// Brand palette
const brandPalette = {
  white: '#FFFFFF',
  green: '#34A853',
  orange: '#FB8C00',
  // Add other common colors if needed
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  }
};

export const getAppTheme = (mode: PaletteMode) => createTheme({
  palette: {
    mode,
    primary: {
      main: brandPalette.green, // Green as primary
      contrastText: brandPalette.white,
    },
    secondary: {
      main: brandPalette.orange, // Orange as secondary
      contrastText: brandPalette.white,
    },
    background: {
      default: mode === 'light' ? brandPalette.grey[100] : brandPalette.grey[900],
      paper: mode === 'light' ? brandPalette.white : brandPalette.grey[800],
    },
    text: {
      primary: mode === 'light' ? brandPalette.grey[900] : brandPalette.grey[50],
      secondary: mode === 'light' ? brandPalette.grey[700] : brandPalette.grey[300],
    },
    // Incorporate other brand colors if desired
    // success: { main: brandPalette.green },
    // warning: { main: brandPalette.orange },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
      'Apple Color Emoji',
      'Segoe UI Emoji',
      'Segoe UI Symbol',
    ].join(','),
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500 },
    h3: { fontSize: '1.75rem', fontWeight: 500 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'light' ? brandPalette.green : theme.palette.background.paper,
          color: theme.palette.mode === 'light' ? brandPalette.white : theme.palette.text.primary,
        }),
      },
    },
  },
});
