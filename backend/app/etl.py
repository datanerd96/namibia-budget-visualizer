import pandas as pd
from typing import List, Optional
from pathlib import Path
from .models import BudgetEntry, CPIData # Assuming models.py is in the same directory
import json # Added for placeholder CPI loading

# Define the path to the data directory.
# In a real application, this might be configurable.
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DEFAULT_BUDGET_CSV = DATA_DIR / "budget_data.csv"
DEFAULT_CPI_JSON = DATA_DIR / "cpi_data.json"

def load_budget_data(csv_path: Path = DEFAULT_BUDGET_CSV) -> List[BudgetEntry]:
    """
    Loads budget data from a CSV file, validates it, and returns a list of BudgetEntry objects.

    The CSV file is expected to have the following columns:
    - fy (string, e.g., "2020/21")
    - vote (string, name of ministry/sector)
    - category (string, "Operational", "Development", "Statutory")
    - sub_category (string, optional)
    - amount_nad_millions (float)

    Args:
        csv_path: Path to the CSV file. Defaults to DATA_DIR / "budget_data.csv".

    Returns:
        A list of BudgetEntry objects.

    Raises:
        FileNotFoundError: If the CSV file is not found.
        ValueError: If the CSV data is invalid (e.g., missing columns, incorrect data types).
    """
    if not csv_path.exists():
        # Create a dummy CSV if it doesn't exist, for easier first run.
        # In a production system, you'd likely raise FileNotFoundError immediately.
        print(f"Warning: Budget data CSV not found at {csv_path}. Creating a dummy file for demonstration.")
        if not DATA_DIR.exists():
            DATA_DIR.mkdir(parents=True, exist_ok=True)
        dummy_data = {
            'fy': ['2020/21', '2021/22', '2022/23', '2023/24', '2024/25'],
            'vote': ['Education', 'Health', 'Defence', 'Infrastructure', 'Debt Servicing'],
            'category': ['Operational', 'Development', 'Operational', 'Development', 'Statutory'],
            'sub_category': ['Primary', None, 'Logistics', 'Roads', None],
            'amount_nad_millions': [100.5, 50.2, 75.0, 120.0, 90.3]
        }
        dummy_df = pd.DataFrame(dummy_data)
        dummy_df.to_csv(csv_path, index=False)
        print(f"Dummy budget_data.csv created at {csv_path}")
        # raise FileNotFoundError(f"Budget data CSV not found at {csv_path}")


    try:
        df = pd.read_csv(csv_path, dtype={'fy': str, 'vote': str, 'category': str, 'sub_category': str})
    except Exception as e:
        raise ValueError(f"Error reading CSV file {csv_path}: {e}")

    expected_columns = ["fy", "vote", "category", "amount_nad_millions"]
    if not all(col in df.columns for col in expected_columns):
        missing = [col for col in expected_columns if col not in df.columns]
        raise ValueError(f"CSV file {csv_path} missing required columns: {missing}")

    if 'sub_category' not in df.columns:
        df['sub_category'] = None

    df['sub_category'] = df['sub_category'].astype(object).where(pd.notnull(df['sub_category']), None)

    df['amount_nad_millions'] = pd.to_numeric(df['amount_nad_millions'], errors='coerce')
    if df['amount_nad_millions'].isnull().any():
        invalid_rows = df[df['amount_nad_millions'].isnull()]
        raise ValueError(f"Invalid non-numeric data found in 'amount_nad_millions' column in file {csv_path}. Problematic rows: \n{invalid_rows}")

    budget_entries: List[BudgetEntry] = []
    validation_errors = []
    for index, row in df.iterrows():
        try:
            entry_data = {
                "fy": row["fy"],
                "vote": row["vote"],
                "category": row["category"],
                "sub_category": row.get("sub_category"),
                "amount_nad_millions": row["amount_nad_millions"],
            }
            budget_entries.append(BudgetEntry(**entry_data))
        except Exception as e:
            validation_errors.append({"row_index": index, "data": row.to_dict(), "error": str(e)})

    if validation_errors:
        # Log or print all validation errors
        print(f"Warning: Encountered {len(validation_errors)} validation error(s) while processing {csv_path}:")
        for err in validation_errors[:5]: # Print first 5 errors
             print(f"  Row {err['row_index']}: {err['error']} - Data: {err['data']}")
        # Decide if this should be a hard error or just a warning
        # For now, continue with successfully parsed entries if any

    if not budget_entries and not df.empty and validation_errors:
        raise ValueError(f"No valid budget entries could be parsed from {csv_path} due to validation errors. Check data format and Pydantic model.")

    return budget_entries

def load_cpi_data(cpi_data_path: Path = DEFAULT_CPI_JSON) -> Optional[CPIData]:
    """
    Loads CPI data from a JSON file.

    The JSON file is expected to match the CPIData Pydantic model:
    {
      "year_base": 2019,
      "values": {
        "2019/20": 100.0,
        "2020/21": 102.2,
        "2021/22": 105.5,
        "2022/23": 110.1,
        "2023/24": 115.3,
        "2024/25": 120.0
      }
    }

    Args:
        cpi_data_path: Path to the JSON file. Defaults to DATA_DIR / "cpi_data.json".

    Returns:
        A CPIData object or None if the file is not found or data is invalid.
    """
    if not cpi_data_path.exists():
        print(f"Warning: CPI data file not found at {cpi_data_path}. Creating a dummy file for demonstration.")
        if not DATA_DIR.exists():
            DATA_DIR.mkdir(parents=True, exist_ok=True)
        dummy_cpi = {
            "year_base": 2019,
            "values": {
                "2019/20": 100.0, # Assuming base year is 2019, FY 2019/20 index is 100
                "2020/21": 102.2,
                "2021/22": 106.5, # Adjusted example values
                "2022/23": 112.0,
                "2023/24": 118.7,
                "2024/25": 125.0
            }
        }
        try:
            with open(cpi_data_path, 'w') as f:
                json.dump(dummy_cpi, f, indent=2)
            print(f"Dummy cpi_data.json created at {cpi_data_path}")
        except Exception as e:
            print(f"Error creating dummy CPI data file: {e}")
            return None # Cannot proceed if dummy creation fails
        # return CPIData(**dummy_cpi) # Use the created dummy data

    try:
        with open(cpi_data_path, 'r') as f:
            data = json.load(f)
        return CPIData(**data)
    except FileNotFoundError: # Should be caught by exists() check, but as a safeguard
        print(f"CPI data file not found at {cpi_data_path}. Real term calculations may not be available.")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding CPI JSON from {cpi_data_path}: {e}")
        return None
    except Exception as e: # Catches Pydantic validation errors too
        print(f"Error loading or validating CPI data from {cpi_data_path}: {e}")
        return None

if __name__ == '__main__':
    print(f"Data directory configured to: {DATA_DIR}")

    # Ensure data directory exists
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Created data directory: {DATA_DIR}")

    # Test load_budget_data
    try:
        print(f"Attempting to load budget data from: {DEFAULT_BUDGET_CSV}")
        entries = load_budget_data() # Will create dummy if not exists
        if entries:
            print(f"Successfully loaded {len(entries)} budget entries.")
            # print(entries[0])
        else:
            print("No budget entries loaded. The CSV might be empty or all rows failed validation.")

    except FileNotFoundError as e:
        print(f"Error: {e}. Please ensure a 'budget_data.csv' exists in the '{DATA_DIR}' directory or can be created.")
    except ValueError as e:
        print(f"Error processing budget data: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during budget data loading: {e}")

    # Test load_cpi_data
    try:
        print(f"Attempting to load CPI data from: {DEFAULT_CPI_JSON}")
        cpi_data = load_cpi_data() # Will create dummy if not exists
        if cpi_data:
            print(f"Successfully loaded CPI data. Base year: {cpi_data.year_base}, Values for 2020/21: {cpi_data.values.get('2020/21')}")
        else:
            print("CPI data could not be loaded. Real term calculations might be affected.")
    except Exception as e:
        print(f"An unexpected error occurred during CPI data loading: {e}")
