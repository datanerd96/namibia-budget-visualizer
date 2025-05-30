import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd

# Import the FastAPI app instance from main.py
# The path needs to be correct based on where pytest is run from.
# Assuming pytest is run from the root directory containing 'backend'.
from backend.app.main import app
from backend.app.models import BudgetEntry, CPIData, KPIData

# Use a TestClient مرسلة by FastAPI
client = TestClient(app)

# --- Mock Data ---
MOCK_BUDGET_ENTRIES_DATA = [
    {"fy": "2020/21", "vote": "Education", "category": "Operational", "sub_category": "Salaries", "amount_nad_millions": 100.0},
    {"fy": "2020/21", "vote": "Health", "category": "Operational", "sub_category": None, "amount_nad_millions": 75.0},
    {"fy": "2021/22", "vote": "Education", "category": "Development", "sub_category": "Infrastructure", "amount_nad_millions": 50.0},
    {"fy": "2021/22", "vote": "Debt Servicing", "category": "Statutory", "sub_category": None, "amount_nad_millions": 200.0},
    {"fy": "2022/23", "vote": "Education", "category": "Operational", "sub_category": "Materials", "amount_nad_millions": 110.0},
]

MOCK_BUDGET_ENTRIES = [BudgetEntry(**data) for data in MOCK_BUDGET_ENTRIES_DATA]
MOCK_BUDGET_DF = pd.DataFrame(MOCK_BUDGET_ENTRIES_DATA)

MOCK_CPI_DATA_DICT = {
    "year_base": 2020,
    "values": {
        "2020/21": 100.0,
        "2021/22": 105.0,
        "2022/23": 110.0,
    }
}
MOCK_CPI_DATA = CPIData(**MOCK_CPI_DATA_DICT)


# --- Fixture to patch data loaded in routes.py ---
@pytest.fixture(scope="module", autouse=True)
def patch_data_loading():
    """
    Patches the global data variables in routes.py (BUDGET_DATA, BUDGET_DF, CPI_DATA)
    for the duration of the tests in this module.
    This ensures that API tests use controlled mock data and are not
    dependent on the etl.py module or actual files in data/.
    """
    # The target strings for patch must be the exact location where these variables are defined and used.
    # If routes.py loads them as `from .etl import load_budget_data` and then calls `load_budget_data()`,
    # you'd patch `load_budget_data` within the routes module.
    # However, the current routes.py loads them as global variables at import time.
    # So we patch these global variables directly within the routes module.

    # It's important that these paths correctly point to where BUDGET_DF and CPI_DATA
    # are defined in the `backend.app.routes` module.
    with patch('backend.app.routes.BUDGET_DATA', MOCK_BUDGET_ENTRIES),          patch('backend.app.routes.BUDGET_DF', MOCK_BUDGET_DF),          patch('backend.app.routes.CPI_DATA', MOCK_CPI_DATA):
        yield

# --- Test Cases ---

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    # With patch_data_loading, these should reflect the mocked state
    assert response.json() == {"status": "ok", "budget_data_loaded": True, "cpi_data_loaded": True}

def test_get_budget_entries_no_filters():
    response = client.get("/api/v1/budget-entries/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == len(MOCK_BUDGET_ENTRIES)
    # Check if the amounts are floats (Pydantic should handle this)
    assert isinstance(data[0]["amount_nad_millions"], float)

def test_get_budget_entries_filter_fy():
    response = client.get("/api/v1/budget-entries/?fy=2020/21")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(item['fy'] == "2020/21" for item in data)

def test_get_budget_entries_filter_vote():
    response = client.get("/api/v1/budget-entries/?vote=Education")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all(item['vote'] == "Education" for item in data)

def test_get_budget_entries_filter_category():
    response = client.get("/api/v1/budget-entries/?category=Operational")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3 # Education 2020/21, Health 2020/21, Education 2022/23
    assert all(item['category'] == "Operational" for item in data)

def test_get_budget_entries_multiple_filters():
    response = client.get("/api/v1/budget-entries/?fy=2020/21&vote=Education")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['fy'] == "2020/21"
    assert data[0]['vote'] == "Education"

def test_get_budget_entries_real_terms_adjustment():
    # Test real terms for FY 2021/22 (Education, amount 50.0, CPI 105.0)
    # Base CPI is 100.0 for 2020/21 (MOCK_CPI_DATA.year_base is 2020).
    # Adjusted amount should be (50.0 / 105.0) * 100.0
    expected_adjusted_amount = round((50.0 / 105.0) * 100.0, 7) # routes.py does not round this specific calc, Pydantic model might

    response = client.get("/api/v1/budget-entries/?fy=2021/22&vote=Education&real_terms=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    # The Pydantic model for BudgetEntry does not specify precision for amount_nad_millions.
    # FastAPI/Pydantic will return full float precision.
    # Let's check if it's close enough.
    assert abs(data[0]['amount_nad_millions'] - expected_adjusted_amount) < 1e-6 # Check for floating point precision

def test_get_budget_entries_real_terms_no_cpi_for_year():
    # Add a budget entry for a year where we don't have CPI data
    # The current MOCK_CPI_DATA only goes up to 2022/23. Let's query for a hypothetical 2023/24 entry.
    # To do this properly, we need to modify MOCK_BUDGET_DF within this test or use a different mock.
    # For simplicity, we'll rely on the existing mock data and query a year present in budget but not CPI.
    # Our current mock CPI data covers all years in MOCK_BUDGET_ENTRIES.
    # Let's test the path where CPI_DATA itself is None (by temporarily re-patching)

    with patch('backend.app.routes.CPI_DATA', None):
        response = client.get("/api/v1/budget-entries/?fy=2021/22&vote=Education&real_terms=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        # Amount should be the original nominal amount as CPI adjustment couldn't be applied
        original_nominal_amount = next(
            entry.amount_nad_millions for entry in MOCK_BUDGET_ENTRIES
            if entry.fy == "2021/22" and entry.vote == "Education"
        )
        assert data[0]['amount_nad_millions'] == original_nominal_amount

def test_get_kpi_data_specific_fy():
    # For 2020/21: Ed (100), Health (75). Total = 175. Op = 175. Dev = 0. Debt = 0.
    response = client.get("/api/v1/kpis/?fy=2020/21")
    assert response.status_code == 200
    kpi = response.json()
    assert kpi['total_budget'] == 175.0
    assert kpi['operational_percentage'] == 100.0
    assert kpi['development_percentage'] == 0.0
    assert kpi['debt_servicing_percentage'] == 0.0 # No "Debt Servicing" vote in 2020/21

def test_get_kpi_data_latest_fy():
    # Latest FY in mock data is 2022/23: Ed (110 Op). Total = 110. Op = 110. Dev=0. Debt=0
    response = client.get("/api/v1/kpis/") # No FY specified, should use latest
    assert response.status_code == 200
    kpi = response.json()
    assert kpi['total_budget'] == 110.0
    assert kpi['operational_percentage'] == 100.0
    assert kpi['development_percentage'] == 0.0
    assert kpi['debt_servicing_percentage'] == 0.0

def test_get_kpi_data_with_debt_servicing():
    # For 2021/22: Ed (50 Dev), Debt Servicing (200 Stat). Total = 250. Op = 0. Dev = 50. Debt = 200.
    response = client.get("/api/v1/kpis/?fy=2021/22")
    assert response.status_code == 200
    kpi = response.json()
    assert kpi['total_budget'] == 250.0
    assert kpi['operational_percentage'] == 0.0 # 0 / 250
    assert kpi['development_percentage'] == 20.0 # 50 / 250
    assert kpi['debt_servicing_percentage'] == 80.0 # 200 / 250

def test_get_kpi_data_fy_not_found():
    response = client.get("/api/v1/kpis/?fy=1999/00")
    assert response.status_code == 404 # As per routes.py logic

def test_get_cpi_data_endpoint():
    response = client.get("/api/v1/cpi-data/")
    assert response.status_code == 200
    data = response.json()
    assert data['year_base'] == MOCK_CPI_DATA.year_base
    assert data['values'] == MOCK_CPI_DATA.values

def test_get_cpi_data_endpoint_when_none():
    with patch('backend.app.routes.CPI_DATA', None):
        response = client.get("/api/v1/cpi-data/")
        assert response.status_code == 200 # Returns null (None)
        assert response.json() is None


def test_get_distinct_values_fy():
    response = client.get("/api/v1/distinct-values/?field=fy")
    assert response.status_code == 200
    data = response.json()
    # Sorted unique FYs from MOCK_BUDGET_DF
    expected_fys = sorted(MOCK_BUDGET_DF['fy'].unique().tolist())
    assert data['fy'] == expected_fys

def test_get_distinct_values_vote():
    response = client.get("/api/v1/distinct-values/?field=vote")
    assert response.status_code == 200
    data = response.json()
    expected_votes = sorted(MOCK_BUDGET_DF['vote'].unique().tolist())
    assert sorted(data['vote']) == expected_votes # Order might not be guaranteed from unique()

def test_get_distinct_values_invalid_field():
    response = client.get("/api/v1/distinct-values/?field=invalid_field")
    assert response.status_code == 400

def test_get_growth_data():
    # For "Education": 2020/21 (100), 2021/22 (50), 2022/23 (110)
    response = client.get("/api/v1/growth-data/?vote_name=Education")
    assert response.status_code == 200
    data = response.json()
    assert data['vote'] == "Education"
    assert len(data['growth_data']) == 3

    gd = data['growth_data']
    # 2020/21
    assert gd[0]['fy'] == "2020/21"
    assert gd[0]['amount_nad_millions'] == 100.0
    assert gd[0]['absolute_growth'] == 0 # First year
    assert gd[0]['percentage_growth'] == 0 # First year

    # 2021/22 (50 from 100)
    assert gd[1]['fy'] == "2021/22"
    assert gd[1]['amount_nad_millions'] == 50.0
    assert gd[1]['absolute_growth'] == -50.0
    assert abs(gd[1]['percentage_growth'] - (-50.0)) < 1e-6

    # 2022/23 (110 from 50)
    assert gd[2]['fy'] == "2022/23"
    assert gd[2]['amount_nad_millions'] == 110.0
    assert gd[2]['absolute_growth'] == 60.0
    assert abs(gd[2]['percentage_growth'] - (120.0)) < 1e-6 # (60/50)*100

def test_get_growth_data_vote_not_found():
    response = client.get("/api/v1/growth-data/?vote_name=NonExistentVote")
    assert response.status_code == 404

# Example of testing an endpoint when no data is loaded (e.g. initial load failed)
def test_get_budget_entries_no_data_loaded():
    with patch('backend.app.routes.BUDGET_DATA', []),          patch('backend.app.routes.BUDGET_DF', pd.DataFrame()):
        response = client.get("/api/v1/budget-entries/")
        assert response.status_code == 503 # Service Unavailable
        assert "Budget data is not available" in response.json()["detail"]

def test_get_kpis_no_data_loaded():
    with patch('backend.app.routes.BUDGET_DF', pd.DataFrame()):
        response = client.get("/api/v1/kpis/")
        assert response.status_code == 503 # Service Unavailable
        assert "Budget data is not available" in response.json()["detail"]
