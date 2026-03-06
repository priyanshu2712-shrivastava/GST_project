"""
Tally XML Export
================
Generates Tally-compatible XML for importing purchase vouchers.

TALLY XML STRUCTURE:
<ENVELOPE>
  <HEADER>...</HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>...</REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER>...</VOUCHER>  ← One per bill
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>

WHY XML (not API)?
- Tally ERP 9 / Tally Prime uses XML import format
- Most CA offices and businesses still use Tally for accounting
- This is the standard integration method for third-party tools

NOTE: This generates simplified voucher entries.
Production Tally XML may need company-specific ledger names.
"""

import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime
from typing import List

from app.config import settings


def generate_tally_xml(bills: list, month: int, year: int) -> str:
    """
    Generate Tally-compatible XML from processed bills.

    Each bill becomes a Purchase voucher entry with:
    - Party ledger (vendor)
    - Purchase ledger (expense category)
    - GST ledgers (CGST/SGST/IGST)

    Args:
        bills: List of Bill model objects
        month: Month number (1-12)
        year: Year (e.g., 2026)

    Returns:
        Path to the generated .xml file
    """
    # Root envelope
    envelope = ET.Element("ENVELOPE")

    # Header
    header = ET.SubElement(envelope, "HEADER")
    ET.SubElement(header, "TALLYREQUEST").text = "Import Data"

    # Body
    body = ET.SubElement(envelope, "BODY")
    import_data = ET.SubElement(body, "IMPORTDATA")

    # Request descriptor
    request_desc = ET.SubElement(import_data, "REQUESTDESC")
    ET.SubElement(request_desc, "REPORTNAME").text = "Vouchers"
    static_vars = ET.SubElement(request_desc, "STATICVARIABLES")
    ET.SubElement(static_vars, "SVCURRENTCOMPANY").text = "GST Bill Digitization"

    # Request data
    request_data = ET.SubElement(import_data, "REQUESTDATA")

    for bill in bills:
        tally_msg = ET.SubElement(request_data, "TALLYMESSAGE", xmlns_UDF="TallyUDF")
        voucher = ET.SubElement(tally_msg, "VOUCHER", REMOTEID="", VCHTYPE="Purchase", ACTION="Create")

        # Voucher date (Tally format: YYYYMMDD)
        bill_date = bill.invoice_date or datetime.now()
        ET.SubElement(voucher, "DATE").text = bill_date.strftime("%Y%m%d")

        # Voucher type and number
        ET.SubElement(voucher, "VOUCHERTYPENAME").text = "Purchase"
        ET.SubElement(voucher, "VOUCHERNUMBER").text = bill.invoice_number or f"AUTO-{bill.id}"
        ET.SubElement(voucher, "REFERENCE").text = bill.invoice_number or ""

        # Narration (description for the entry)
        category = bill.final_category or bill.ai_category or "Purchase"
        narration = f"{category} - {bill.vendor_name or 'Unknown Vendor'}"
        ET.SubElement(voucher, "NARRATION").text = narration

        # Party name (vendor)
        ET.SubElement(voucher, "PARTYLEDGERNAME").text = bill.vendor_name or "Sundry Creditors"

        # GSTIN
        if bill.vendor_gstin:
            ET.SubElement(voucher, "PARTYGSTIN").text = bill.vendor_gstin

        # --- Ledger Entries ---

        # 1. Party ledger (credit side — we owe the vendor)
        party_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        ET.SubElement(party_entry, "LEDGERNAME").text = bill.vendor_name or "Sundry Creditors"
        ET.SubElement(party_entry, "ISDEEMEDPOSITIVE").text = "No"
        # Negative = credit in Tally
        ET.SubElement(party_entry, "AMOUNT").text = str(round(bill.total_amount, 2))

        # 2. Purchase ledger (debit side — expense)
        purchase_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
        # Map category to a Tally ledger name
        ledger_name = _get_tally_ledger_name(category)
        ET.SubElement(purchase_entry, "LEDGERNAME").text = ledger_name
        ET.SubElement(purchase_entry, "ISDEEMEDPOSITIVE").text = "Yes"
        ET.SubElement(purchase_entry, "AMOUNT").text = str(-round(bill.subtotal or bill.total_amount, 2))

        # 3. CGST ledger (if applicable)
        if bill.cgst and bill.cgst > 0:
            cgst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(cgst_entry, "LEDGERNAME").text = f"Input CGST {bill.gst_rate or 18}%"
            ET.SubElement(cgst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(cgst_entry, "AMOUNT").text = str(-round(bill.cgst, 2))

        # 4. SGST ledger (if applicable)
        if bill.sgst and bill.sgst > 0:
            sgst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(sgst_entry, "LEDGERNAME").text = f"Input SGST {bill.gst_rate or 18}%"
            ET.SubElement(sgst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(sgst_entry, "AMOUNT").text = str(-round(bill.sgst, 2))

        # 5. IGST ledger (if applicable)
        if bill.igst and bill.igst > 0:
            igst_entry = ET.SubElement(voucher, "ALLLEDGERENTRIES.LIST")
            ET.SubElement(igst_entry, "LEDGERNAME").text = f"Input IGST {bill.gst_rate or 18}%"
            ET.SubElement(igst_entry, "ISDEEMEDPOSITIVE").text = "Yes"
            ET.SubElement(igst_entry, "AMOUNT").text = str(-round(bill.igst, 2))

    # Pretty-print the XML
    xml_string = ET.tostring(envelope, encoding="unicode")
    pretty_xml = minidom.parseString(xml_string).toprettyxml(indent="  ")

    # Remove the XML declaration line (Tally expects raw XML)
    lines = pretty_xml.split("\n")
    if lines[0].startswith("<?xml"):
        pretty_xml = "\n".join(lines[1:])

    # Save file
    filename = f"Tally_Import_{year}_{month:02d}.xml"
    filepath = os.path.join(str(settings.EXPORT_DIR), filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(pretty_xml)

    return filepath


def _get_tally_ledger_name(category: str) -> str:
    """
    Map expense category to a Tally-standard ledger name.

    NOTE: These are common default Tally ledger names.
    In production, this mapping should be configurable per company,
    as different businesses use different ledger structures.
    """
    LEDGER_MAP = {
        "office_supplies": "Office Expenses",
        "raw_materials": "Raw Materials",
        "trading_goods": "Purchase Account",
        "capital_goods": "Fixed Assets",
        "professional_services": "Professional Fees",
        "utilities": "Electricity & Water",
        "rent": "Rent Paid",
        "travel": "Travelling Expenses",
        "food_beverages": "Staff Welfare",
        "medical_supplies": "Medical Expenses",
        "personal_expense": "Drawings / Personal",
        "vehicle_expense": "Vehicle Running Expenses",
        "communication": "Telephone & Internet",
        "insurance": "Insurance Premium",
        "repairs_maintenance": "Repairs & Maintenance",
        "marketing": "Advertisement Expenses",
    }
    return LEDGER_MAP.get(category.lower(), "Miscellaneous Expenses")
