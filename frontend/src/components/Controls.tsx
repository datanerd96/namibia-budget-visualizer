import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  CircularProgress,
  Autocomplete,
  Chip,
} from '@mui/material';
import { fetchDistinctValues } from '../services/api'; // To populate filters

// Define types for filter values
export interface FilterValues {
  selectedYears: string[];
  selectedVotes: string[];
  selectedCategories: string[];
  isRealTerms: boolean;
  compareModeEnabled: boolean; // Placeholder for now
  // searchVoteQuery: string; // Can be part of Autocomplete for votes
}

interface ControlsProps {
  initialFilterValues: FilterValues;
  onFilterChange: (newFilters: FilterValues) => void;
  // Potentially, pass down all distinct values if fetched at a higher level
  // distinctYears?: string[];
  // distinctVotes?: string[];
  // distinctCategories?: string[];
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const Controls: React.FC<ControlsProps> = ({ initialFilterValues, onFilterChange }) => {
  const [filters, setFilters] = useState<FilterValues>(initialFilterValues);

  const [distinctYears, setDistinctYears] = useState<string[]>([]);
  const [distinctVotes, setDistinctVotes] = useState<string[]>([]);
  const [distinctCategories, setDistinctCategories] = useState<string[]>([]);

  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch distinct values for filters on component mount
  useEffect(() => {
    const loadDistinctData = async () => {
      setLoadingYears(true);
      try {
        setDistinctYears(await fetchDistinctValues('fy'));
      } catch (error) {
        console.error('Failed to fetch distinct fiscal years', error);
      } finally {
        setLoadingYears(false);
      }

      setLoadingVotes(true);
      try {
        setDistinctVotes(await fetchDistinctValues('vote'));
      } catch (error) {
        console.error('Failed to fetch distinct votes', error);
      } finally {
        setLoadingVotes(false);
      }

      setLoadingCategories(true);
      try {
        // Assuming 'category' is a valid field for distinct values API
        setDistinctCategories(await fetchDistinctValues('category'));
      } catch (error) {
        console.error('Failed to fetch distinct categories', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadDistinctData();
  }, []);

  // Debounce filter changes or handle on blur/apply button if performance becomes an issue
  const handleMultiSelectChange = (field: keyof FilterValues, value: string | string[]) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters); // Propagate changes immediately
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    const newFilters = { ...filters, [name]: checked };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Reset filters function (optional)
  // const resetFilters = () => {
  //   setFilters(initialFilterValues);
  //   onFilterChange(initialFilterValues);
  // };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom component="h3">Filters & Controls</Typography>
      <Grid container spacing={2} alignItems="center">
        {/* Year Picker (Multi-select) */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="year-multi-select-label">Fiscal Year(s)</InputLabel>
            <Select
              labelId="year-multi-select-label"
              multiple
              value={filters.selectedYears}
              onChange={(e) => handleMultiSelectChange('selectedYears', e.target.value as string[])}
              input={<OutlinedInput label="Fiscal Year(s)" />}
              renderValue={(selected) => (selected as string[]).join(', ')}
              MenuProps={MenuProps}
              disabled={loadingYears}
            >
              {loadingYears && <MenuItem disabled><CircularProgress size={20} /></MenuItem>}
              {distinctYears.map((year) => (
                <MenuItem key={year} value={year}>
                  <Checkbox checked={filters.selectedYears.indexOf(year) > -1} />
                  <ListItemText primary={year} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Vote Filter (Multi-select Autocomplete for searchability) */}
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            multiple
            fullWidth
            size="small"
            options={distinctVotes}
            value={filters.selectedVotes}
            loading={loadingVotes}
            getOptionLabel={(option) => option}
            onChange={(event, newValue) => {
              handleMultiSelectChange('selectedVotes', newValue as string[]);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vote(s) / Sector(s)"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loadingVotes ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} />
              ))
            }
          />
        </Grid>

        {/* Category Filter (Multi-select) */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="category-multi-select-label">Category(s)</InputLabel>
            <Select
              labelId="category-multi-select-label"
              multiple
              value={filters.selectedCategories}
              onChange={(e) => handleMultiSelectChange('selectedCategories', e.target.value as string[])}
              input={<OutlinedInput label="Category(s)" />}
              renderValue={(selected) => (selected as string[]).join(', ')}
              MenuProps={MenuProps}
              disabled={loadingCategories}
            >
              {loadingCategories && <MenuItem disabled><CircularProgress size={20} /></MenuItem>}
              {distinctCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  <Checkbox checked={filters.selectedCategories.indexOf(category) > -1} />
                  <ListItemText primary={category} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Nominal vs Real Terms Toggle */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControlLabel
            control={
              <Switch
                checked={filters.isRealTerms}
                onChange={handleSwitchChange}
                name="isRealTerms"
              />
            }
            labelPlacement="start"
            label={<Typography variant="body2">Real Terms (Adjusted for CPI)</Typography>}
            sx={{ justifyContent: 'flex-start', m:0, width: '100%' }}
          />
        </Grid>

        {/* Compare Votes Mode (Placeholder) */}
        {/* <Grid item xs={12} sm={6} md={3}>
          <FormControlLabel
            control={
              <Switch
                checked={filters.compareModeEnabled}
                onChange={handleSwitchChange}
                name="compareModeEnabled"
              />
            }
            label="Compare Votes Mode"
          />
        </Grid> */}
      </Grid>
    </Paper>
  );
};

export default Controls;
