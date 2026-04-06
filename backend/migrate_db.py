"""Run ALTER TABLE to add missing columns without losing existing data (PostgreSQL)."""
import sys
sys.path.insert(0, ".")
from app.database import engine
from sqlalchemy import text

columns = [
    ("buyer_name",     "VARCHAR(255)"),
    ("buyer_gstin",    "VARCHAR(15)"),
    ("buyer_address",  "TEXT"),
    ("payment_mode",   "VARCHAR(50)"),
    ("place_of_supply","VARCHAR(100)"),
    ("reverse_charge", "BOOLEAN DEFAULT FALSE"),
    ("supplier_ref",   "VARCHAR(100)"),
    ("buyer_order_no", "VARCHAR(100)"),
]

with engine.connect() as conn:
    # Get existing columns using information_schema (works for PostgreSQL)
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'bills'"
    ))
    existing = {row[0] for row in result}
    print(f"Existing columns: {existing}")

    for col_name, col_type in columns:
        if col_name not in existing:
            sql = f"ALTER TABLE bills ADD COLUMN {col_name} {col_type}"
            conn.execute(text(sql))
            conn.commit()
            print(f"  ✅ Added: {col_name}")
        else:
            print(f"  ⏭️  Already exists: {col_name}")

print("\nMigration complete!")
