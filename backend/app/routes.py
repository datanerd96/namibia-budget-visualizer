from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import pandas as pd

from .etl import load_budget_data, load_cpi_data, DEFAULT_BUDGET_CSV, DEFAULT_CPI_JSON
from .models import BudgetEntry, BudgetQuery, KPIData, CPIData

router = APIRouter()

# Load data on startup (cached in memory)
# In a production app, consider a more robust caching mechanism or background updates
try:
    BUDGET_DATA: List[BudgetEntry] = load_budget_data(DEFAULT_BUDGET_CSV)
    BUDGET_DF: pd.DataFrame = pd.DataFrame([entry.model_dump() for entry in BUDGET_DATA])
except (FileNotFoundError, ValueError) as e:
    print(f"CRITICAL: Could not load budget data on startup: {e}")
    BUDGET_DATA = []
    BUDGET_DF = pd.DataFrame() # Empty DataFrame

try:
    CPI_DATA: Optional[CPIData] = load_cpi_data(DEFAULT_CPI_JSON)
except Exception as e:
    print(f"WARNING: Could not load CPI data on startup: {e}")
    CPI_DATA = None

@router.get("/api/v1/health", tags=["General"])
async def health_check():
    """
    Simple health check endpoint.
    """
    return {"status": "ok", "budget_data_loaded": len(BUDGET_DATA) > 0, "cpi_data_loaded": CPI_DATA is not None}

@router.get("/api/v1/budget-entries/", response_model=List[BudgetEntry], tags=["Budget Data"])
async def get_budget_entries(
    fy: Optional[List[str]] = Query(None, description="Fiscal Year(s) to filter by, e.g., '2020/21'"),
    vote: Optional[List[str]] = Query(None, description="Vote(s) (ministry/sector) to filter by"),
    category: Optional[List[str]] = Query(None, description="Category(s) of expenditure to filter by"),
    real_terms: Optional[bool] = Query(False, description="Adjust amounts to real terms using CPI data (if available)")
) -> List[BudgetEntry]:
    """
    Retrieve budget entries, optionally filtered by fiscal year, vote, and category.
    Amounts can be adjusted to real terms if CPI data is available and real_terms=true.
    """
    if not BUDGET_DATA:
        raise HTTPException(status_code=503, detail="Budget data is not available. Please check server logs.")

    filtered_df = BUDGET_DF.copy()

    if fy:
        filtered_df = filtered_df[filtered_df['fy'].isin(fy)]
    if vote:
        filtered_df = filtered_df[filtered_df['vote'].isin(vote)]
    if category:
        filtered_df = filtered_df[filtered_df['category'].isin(category)]

    if real_terms:
        if CPI_DATA and CPI_DATA.values and CPI_DATA.year_base:
            base_year_str = f"{CPI_DATA.year_base-1}/{str(CPI_DATA.year_base)[-2:]}" # Approx base FY string
            base_cpi = CPI_DATA.values.get(base_year_str) # CPI for base year (e.g. 2019/20 -> 100)

            # Find the CPI for the base year of the CPI data (e.g., if year_base is 2019, the index for 2019 is 100)
            # This is a simplification. Correct would be to use the CPI_DATA.year_base as the reference for 100.
            # For instance, if CPI_DATA.year_base = 2019, and values are {"2019/20": 100, "2020/21": 102.2},
            # then amounts from 2020/21 are deflated by (100 / 102.2).

            # A more direct approach: find the CPI for the year that corresponds to the '100' index.
            # Let's assume CPI_DATA.values contains the actual index for each FY.
            # And we want to normalize to the CPI_DATA.year_base (e.g. 2019 prices).

            cpi_base_value = None
            # Attempt to find the CPI value for the base year from the provided CPI data.
            # This assumes 'year_base' refers to the 'year' part of 'fy' string, e.g., 2019 for '2019/20'.
            for fy_key, cpi_val in CPI_DATA.values.items():
                if str(CPI_DATA.year_base) in fy_key.split('/')[0]: # Check if the base year is in the first part of 'fy'
                    cpi_base_value = cpi_val
                    break

            if cpi_base_value is None: # Fallback if specific base_year FY not found, use first value as 100 ref if sensible
                # This part is tricky and depends on how CPI_DATA.values is structured.
                # For now, let's assume the values are direct indices and year_base is the reference for 100.
                # This means we need a CPI value for the base_year itself.
                # The dummy cpi_data.json has "2019/20": 100.0 for base_year 2019.
                cpi_base_value_for_deflation = CPI_DATA.values.get(f"{CPI_DATA.year_base}/{str(CPI_DATA.year_base+1)[-2:]}", 100.0)


            def adjust_for_cpi(row):
                cpi_for_row_fy = CPI_DATA.values.get(row['fy'])
                if cpi_for_row_fy and cpi_for_row_fy > 0 and cpi_base_value_for_deflation > 0:
                    return (row['amount_nad_millions'] / cpi_for_row_fy) * cpi_base_value_for_deflation
                return row['amount_nad_millions'] # Return original if no CPI data for that year

            filtered_df['amount_nad_millions'] = filtered_df.apply(adjust_for_cpi, axis=1)
        else:
            # CPI data not available, but real_terms requested.
            # Could raise an error, or return nominal with a warning. For now, return nominal.
            # This case should be communicated to the frontend.
            pass # Amounts remain nominal

    # Convert DataFrame back to list of BudgetEntry models
    # Pydantic will validate the data again upon instantiation.
    try:
        result_entries = [BudgetEntry(**row) for row in filtered_df.to_dict(orient='records')]
    except Exception as e: # Catch potential Pydantic validation errors if transformations were incorrect
        raise HTTPException(status_code=500, detail=f"Error processing data after filtering: {e}")

    return result_entries


@router.get("/api/v1/kpis/", response_model=KPIData, tags=["KPIs"])
async def get_kpi_data(
    fy: Optional[str] = Query(None, description="Fiscal Year to calculate KPIs for (e.g., '2024/25'). If None, uses latest available FY.")
) -> KPIData:
    """
    Retrieve Key Performance Indicators (KPIs) for a specific fiscal year or the latest available.
    """
    if BUDGET_DF.empty:
        raise HTTPException(status_code=503, detail="Budget data is not available.")

    if fy:
        target_df = BUDGET_DF[BUDGET_DF['fy'] == fy]
        if target_df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for fiscal year {fy}.")
    else:
        # Determine the latest FY from the data if not specified
        latest_fy = BUDGET_DF['fy'].unique()
        if not any(latest_fy):
             raise HTTPException(status_code=404, detail="No fiscal years found in data.")
        # Assuming FYs are like '2020/21', sort to get the latest
        latest_fy = sorted(latest_fy, key=lambda x: int(x.split('/')[0]), reverse=True)[0]
        target_df = BUDGET_DF[BUDGET_DF['fy'] == latest_fy]
        fy = latest_fy # For reporting in response (though not part of KPIData model)

    total_budget = target_df['amount_nad_millions'].sum()
    if total_budget == 0: # Avoid division by zero if a year has no budget or only zero amounts
        return KPIData(
            total_budget=0,
            operational_percentage=0,
            development_percentage=0,
            debt_servicing_percentage=0
        )

    operational_budget = target_df[target_df['category'] == 'Operational']['amount_nad_millions'].sum()
    development_budget = target_df[target_df['category'] == 'Development']['amount_nad_millions'].sum()

    # Assuming 'Debt Servicing' is a 'vote'. This might need adjustment based on actual data structure.
    # It could also be a specific 'category' or 'sub_category'.
    # For now, we'll look for 'Debt Servicing' in the 'vote' column.
    debt_servicing_budget = target_df[target_df['vote'].str.contains('Debt Servicing', case=False, na=False)]['amount_nad_millions'].sum()

    operational_percentage = (operational_budget / total_budget) * 100 if total_budget else 0
    development_percentage = (development_budget / total_budget) * 100 if total_budget else 0
    debt_servicing_percentage = (debt_servicing_budget / total_budget) * 100 if total_budget else 0

    return KPIData(
        total_budget=round(total_budget, 2),
        operational_percentage=round(operational_percentage, 2),
        development_percentage=round(development_percentage, 2),
        debt_servicing_percentage=round(debt_servicing_percentage, 2)
    )

@router.get("/api/v1/cpi-data/", response_model=Optional[CPIData], tags=["CPI Data"])
async def get_cpi_data_endpoint():
    """
    Retrieve the currently loaded Consumer Price Index (CPI) data.
    This is mainly for debugging or if the frontend needs direct access to CPI values.
    """
    if not CPI_DATA:
        # You could return 404, or just null as per Optional[CPIData]
        return None
    return CPI_DATA

@router.get("/api/v1/distinct-values/", tags=["Filters"])
async def get_distinct_values(
    field: str = Query(..., description="The field for which to get distinct values (e.g., 'fy', 'vote', 'category')")
):
    """
    Get distinct values for specified filter fields (fy, vote, category) to populate filter dropdowns.
    """
    if BUDGET_DF.empty:
        return {field: []}

    if field not in ['fy', 'vote', 'category']:
        raise HTTPException(status_code=400, detail=f"Invalid field specified. Must be one of 'fy', 'vote', 'category'.")

    distinct_values = BUDGET_DF[field].dropna().unique().tolist()

    # Sort fiscal years correctly
    if field == 'fy':
        distinct_values = sorted(distinct_values, key=lambda x: int(x.split('/')[0]))

    return {field: distinct_values}

# Placeholder for year-on-year growth endpoint
@router.get("/api/v1/growth-data/", tags=["Budget Data"])
async def get_growth_data(
    vote_name: str = Query(..., description="The vote (ministry/sector) to calculate growth for")
):
    """
    Calculates year-on-year growth (absolute and percentage) for a specific vote.
    (This is a simplified placeholder - a more robust implementation would be needed)
    """
    if BUDGET_DF.empty:
        raise HTTPException(status_code=503, detail="Budget data is not available.")

    vote_df = BUDGET_DF[BUDGET_DF['vote'] == vote_name].copy()
    if vote_df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for vote: {vote_name}")

    # Group by fiscal year and sum amounts for the specified vote
    yoy_data = vote_df.groupby('fy')['amount_nad_millions'].sum().reset_index()
    yoy_data = yoy_data.sort_values(by='fy', key=lambda x: x.str.split('/').str[0].astype(int)) # Sort by FY

    if len(yoy_data) < 2:
        return {"vote": vote_name, "growth_data": [], "message": "Not enough data points to calculate year-on-year growth."}

    yoy_data['previous_amount'] = yoy_data['amount_nad_millions'].shift(1)
    yoy_data['absolute_growth'] = yoy_data['amount_nad_millions'] - yoy_data['previous_amount']
    yoy_data['percentage_growth'] = (yoy_data['absolute_growth'] / yoy_data['previous_amount']) * 100

    # Replace NaN from shift and potential division by zero with None or 0
    yoy_data = yoy_data.fillna(0) # Or use .where(pd.notnull(yoy_data), None) for JSON nulls

    results = []
    for _, row in yoy_data.iterrows():
        results.append({
            "fy": row['fy'],
            "amount_nad_millions": round(row['amount_nad_millions'],2),
            "absolute_growth": round(row['absolute_growth'],2) if row['previous_amount'] != 0 else 0, # Avoid showing growth if prev amount was 0
            "percentage_growth": round(row['percentage_growth'],2) if row['previous_amount'] != 0 else 0,
        })
    # First year will have 0 growth as there's no previous year in this context
    if results:
        results[0]['absolute_growth'] = 0
        results[0]['percentage_growth'] = 0

    return {"vote": vote_name, "growth_data": results}
