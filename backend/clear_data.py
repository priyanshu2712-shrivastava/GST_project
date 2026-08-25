import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app import models

def clear_all_data():
    session = SessionLocal()
    try:
        # Get all table names
        tables = reversed(Base.metadata.sorted_tables)
        
        for table in tables:
            print(f"Clearing table: {table.name}")
            session.execute(table.delete())
            
        session.commit()
        print("All data cleared successfully!")
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    clear_all_data()
