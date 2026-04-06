"""
Database Reset Script
=====================
Drops ALL tables and recreates them fresh.
Use this for a clean start after model changes.

Run with:
    python reset_db.py
"""

import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app import models  # noqa: F401 — import models so they register with Base

print("=" * 50)
print("GST Bill Digitizer — Database Reset")
print("=" * 50)

print("\n🗑️  Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("✅  All tables dropped.")

print("\n🔨 Creating fresh tables...")
Base.metadata.create_all(bind=engine)
print("✅  All tables created with new schema.")

print("\n🎉 Database reset complete! You can now register companies and upload bills.")
