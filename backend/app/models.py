from typing import Optional
from pydantic import BaseModel, Field

class BudgetEntry(BaseModel):
    """
    Represents a single entry in the budget data.
    """
    fy: str = Field(..., description="Fiscal Year, e.g., '2020/21'")
    vote: str = Field(..., description="Name of the ministry or sector")
    category: str = Field(..., description="Category of expenditure, e.g., 'Operational', 'Development', 'Statutory'")
    sub_category: Optional[str] = Field(None, description="Optional sub-category for more detailed breakdown")
    amount_nad_millions: float = Field(..., description="Budgeted amount in millions of Namibian Dollars")

    class Config:
        orm_mode = True # Allows the model to be used with ORMs, helpful if we ever connect to a DB
        anystr_strip_whitespace = True # Strips whitespace from strings
        schema_extra = {
            "example": {
                "fy": "2023/24",
                "vote": "Education, Arts and Culture",
                "category": "Operational",
                "sub_category": "Basic Education",
                "amount_nad_millions": 15000.75
            }
        }

class BudgetQuery(BaseModel):
    """
    Defines the query parameters for filtering budget data.
    """
    years: Optional[list[str]] = Field(None, description="List of fiscal years to filter by")
    votes: Optional[list[str]] = Field(None, description="List of votes to filter by")
    categories: Optional[list[str]] = Field(None, description="List of categories to filter by")

class KPIData(BaseModel):
    """
    Represents the data structure for Key Performance Indicators.
    """
    total_budget: float
    operational_percentage: float
    development_percentage: float
    debt_servicing_percentage: Optional[float] = None # Assuming debt servicing is a specific 'vote' or 'category'

# Example of how CPI data might be structured if provided via API (for real terms calculation)
class CPIData(BaseModel):
    """
    Represents Consumer Price Index data for a given year.
    """
    year_base: int # e.g., 2019 (for 2019:100)
    values: dict[str, float] # e.g., {"2019/20": 100.0, "2020/21": 102.2, ...}
    # Or perhaps: values: dict[int, float] # e.g., {2019: 100.0, 2020: 102.2, ...} - needs alignment with 'fy' format.
