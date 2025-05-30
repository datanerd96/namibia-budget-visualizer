import axios from 'axios';

// Base URL for the backend API
// In a real app, this would likely come from an environment variable
const API_BASE_URL = 'http://localhost:8000/api/v1'; // Matches backend uvicorn dev server

// --- Interfaces based on backend Pydantic models ---
// These should ideally be kept in sync with backend/app/models.py
// For a larger project, consider sharing types between backend and frontend (e.g. via a shared package or OpenAPI generator)

export interface BudgetEntry {
  fy: string;
  vote: string;
  category: string;
  sub_category?: string | null;
  amount_nad_millions: number;
}

export interface BudgetQueryParameters {
  fy?: string[];
  vote?: string[];
  category?: string[];
  real_terms?: boolean;
}

export interface KPIData {
  total_budget: number;
  operational_percentage: float;
  development_percentage: float;
  debt_servicing_percentage?: float | null;
}

export interface CPIData {
  year_base: number;
  values: Record<string, number>; // e.g., {"2019/20": 100.0, ...}
}

export interface GrowthDataItem {
  fy: string;
  amount_nad_millions: number;
  absolute_growth: number;
  percentage_growth: number;
}

export interface VoteGrowthData {
  vote: string;
  growth_data: GrowthDataItem[];
  message?: string;
}

export interface DistinctValuesResponse {
  fy?: string[];
  vote?: string[];
  category?: string[];
}

// --- API Service Functions ---

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetches budget entries from the API.
 * @param params - Optional query parameters for filtering.
 */
export const fetchBudgetEntries = async (params?: BudgetQueryParameters): Promise<BudgetEntry[]> => {
  try {
    const response = await apiClient.get<BudgetEntry[]>('/budget-entries/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching budget entries:', error);
    // In a real app, you might throw a custom error or handle it more gracefully
    throw error;
  }
};

/**
 * Fetches Key Performance Indicators (KPIs).
 * @param fy - Optional fiscal year. If not provided, API returns KPIs for the latest year.
 */
export const fetchKpiData = async (fy?: string): Promise<KPIData> => {
  try {
    const params = fy ? { fy } : {};
    const response = await apiClient.get<KPIData>('/kpis/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    throw error;
  }
};

/**
 * Fetches the Consumer Price Index (CPI) data.
 */
export const fetchCpiData = async (): Promise<CPIData | null> => {
  try {
    const response = await apiClient.get<CPIData | null>('/cpi-data/');
    return response.data;
  } catch (error) {
    console.error('Error fetching CPI data:', error);
    // CPI data might be optional, so returning null on error might be acceptable
    // depending on how critical it is for the immediate view.
    return null;
  }
};

/**
 * Fetches distinct values for a given field (e.g., 'fy', 'vote', 'category').
 * @param field - The field for which to get distinct values.
 */
export const fetchDistinctValues = async (field: 'fy' | 'vote' | 'category'): Promise<string[]> => {
  try {
    // The API endpoint returns an object like { field: [...] }, e.g. { "fy": ["2020/21", ...] }
    const response = await apiClient.get<Record<string, string[]>>('/distinct-values/', { params: { field } });
    return response.data[field] || [];
  } catch (error) {
    console.error(, error);
    throw error;
  }
};

/**
 * Fetches year-on-year growth data for a specific vote.
 * @param voteName - The name of the vote/ministry/sector.
 */
export const fetchVoteGrowthData = async (voteName: string): Promise<VoteGrowthData> => {
  try {
    const response = await apiClient.get<VoteGrowthData>('/growth-data/', { params: { vote_name: voteName } });
    return response.data;
  } catch (error) {
    console.error(, error);
    throw error;
  }
};

/**
 * Fetches a simple health check from the API.
 */
export const fetchApiHealth = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error fetching API health:', error);
    throw error;
  }
};
