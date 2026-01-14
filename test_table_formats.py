#!/usr/bin/env python3
"""
Test to reproduce the HTML writer format parameter bug.
"""

from astropy.table import Table
import tempfile
import os

# Create the exact table from the bug report
data = [(1.23875234858e-24, 3.2348748432e-15), (2, 4)]
table = Table(data, names=('a', 'b'))

print("=" * 80)
print("TABLE DATA:")
print("=" * 80)
print(table)
print()

# Define the format function
format_func = lambda x: f"{x:.2e}"

print("=" * 80)
print("TESTING HTML WRITER WITH FORMATS")
print("=" * 80)

# Write to HTML with formats
with tempfile.TemporaryDirectory() as tmpdir:
    html_path = os.path.join(tmpdir, 'test.html')
    table.write(html_path, formats={'a': format_func}, overwrite=True)

    # Read and print HTML content
    with open(html_path, 'r') as f:
        html_content = f.read()

    print("HTML Output:")
    print("-" * 80)
    print(html_content)
    print("-" * 80)
    print()

    # Check for the expected and unexpected values
    print("VERIFICATION:")
    print("-" * 80)
    if "1.24e-24" in html_content:
        print("✓ PASS: Found expected formatted value '1.24e-24' in HTML")
    else:
        print("✗ FAIL: Expected formatted value '1.24e-24' NOT found in HTML")

    if "3.23e-15" in html_content:
        print("✓ PASS: Found expected formatted value '3.23e-15' in HTML")
    else:
        print("✗ FAIL: Expected formatted value '3.23e-15' NOT found in HTML")

    if "1.23875234858e-24" in html_content:
        print("✗ FAIL: Found unformatted raw value '1.23875234858e-24' in HTML (should be formatted)")
    else:
        print("✓ PASS: Unformatted raw value '1.23875234858e-24' NOT found in HTML (good)")

    if "3.2348748432e-15" in html_content:
        print("✗ FAIL: Found unformatted raw value '3.2348748432e-15' in HTML (should be formatted)")
    else:
        print("✓ PASS: Unformatted raw value '3.2348748432e-15' NOT found in HTML (good)")

print()
print("=" * 80)
print("TESTING CSV WRITER WITH FORMATS")
print("=" * 80)

# Write to CSV with formats
with tempfile.TemporaryDirectory() as tmpdir:
    csv_path = os.path.join(tmpdir, 'test.csv')
    table.write(csv_path, formats={'a': format_func}, overwrite=True)

    # Read and print CSV content
    with open(csv_path, 'r') as f:
        csv_content = f.read()

    print("CSV Output:")
    print("-" * 80)
    print(csv_content)
    print("-" * 80)
    print()

print()
print("=" * 80)
print("DEBUG INFO: Column Information (BEFORE format applied)")
print("=" * 80)

# Check column info before formats are applied
for col_name in table.colnames:
    col = table[col_name]
    print(f"Column '{col_name}':")
    print(f"  dtype: {col.dtype}")
    if hasattr(col, 'info'):
        print(f"  info.format: {col.info.format}")
    print()

print()
print("=" * 80)
print("TESTING WITH COLUMN INFO FORMAT (col.info.format)")
print("=" * 80)

# Try setting format directly on column info
table2 = Table([(1.23875234858e-24, 3.2348748432e-15), (2, 4)], names=('a', 'b'))
table2['a'].info.format = lambda x: f"{x:.2e}"

print("\nColumn 'a' info.format after direct assignment:")
print(f"  col.info.format: {table2['a'].info.format}")

with tempfile.TemporaryDirectory() as tmpdir:
    html_path = os.path.join(tmpdir, 'test_info_format.html')
    table2.write(html_path, overwrite=True)

    with open(html_path, 'r') as f:
        html_content = f.read()

    print("\nHTML Output (using col.info.format):")
    print("-" * 80)
    print(html_content)
    print("-" * 80)
    print()

    print("VERIFICATION (col.info.format):")
    print("-" * 80)
    if "1.24e-24" in html_content:
        print("✓ PASS: Found expected formatted value '1.24e-24' in HTML")
    else:
        print("✗ FAIL: Expected formatted value '1.24e-24' NOT found in HTML")

    if "3.23e-15" in html_content:
        print("✓ PASS: Found expected formatted value '3.23e-15' in HTML")
    else:
        print("✗ FAIL: Expected formatted value '3.23e-15' NOT found in HTML")

    if "1.23875234858e-24" in html_content:
        print("✗ FAIL: Found unformatted raw value '1.23875234858e-24' in HTML")
    else:
        print("✓ PASS: Unformatted raw value '1.23875234858e-24' NOT found in HTML")

    if "3.2348748432e-15" in html_content:
        print("✗ FAIL: Found unformatted raw value '3.2348748432e-15' in HTML")
    else:
        print("✓ PASS: Unformatted raw value '3.2348748432e-15' NOT found in HTML")
