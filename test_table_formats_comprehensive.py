#!/usr/bin/env python3
"""
Comprehensive test for HTML and CSV writer format parameter handling.
Tests various scenarios to identify any issues with format respect.
"""

from astropy.table import Table
import tempfile
import os

def test_scenario(scenario_name, table, formats=None, expected_values=None):
    """Test a specific scenario."""
    print()
    print("=" * 80)
    print(f"SCENARIO: {scenario_name}")
    print("=" * 80)

    if formats:
        print(f"Formats: {formats}")

    # Test HTML
    print("\n--- HTML OUTPUT ---")
    with tempfile.TemporaryDirectory() as tmpdir:
        html_path = os.path.join(tmpdir, 'test.html')
        if formats:
            table.write(html_path, formats=formats, overwrite=True)
        else:
            table.write(html_path, overwrite=True)

        with open(html_path, 'r') as f:
            html_content = f.read()

        # Extract table content from HTML
        import re
        td_pattern = r'<td>(.*?)</td>'
        td_values = re.findall(td_pattern, html_content)
        print(f"Table cell values: {td_values}")

        if expected_values:
            for expected in expected_values:
                if expected in html_content:
                    print(f"✓ Found expected: {expected}")
                else:
                    print(f"✗ Missing expected: {expected}")

    # Test CSV
    print("\n--- CSV OUTPUT ---")
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = os.path.join(tmpdir, 'test.csv')
        if formats:
            table.write(csv_path, formats=formats, overwrite=True)
        else:
            table.write(csv_path, overwrite=True)

        with open(csv_path, 'r') as f:
            csv_content = f.read()

        print("CSV content:")
        print(csv_content)

        if expected_values:
            for expected in expected_values:
                if expected in csv_content:
                    print(f"✓ Found expected: {expected}")
                else:
                    print(f"✗ Missing expected: {expected}")


# Test 1: Original bug report scenario
print("\n" + "#" * 80)
print("TEST SET 1: ORIGINAL BUG REPORT SCENARIO")
print("#" * 80)

table1 = Table([(1.23875234858e-24, 3.2348748432e-15), (2, 4)], names=('a', 'b'))
test_scenario(
    "Scientific notation with lambda format",
    table1,
    formats={'a': lambda x: f"{x:.2e}"},
    expected_values=['1.24e-24', '3.23e-15']
)

# Test 2: String format specifications
print("\n" + "#" * 80)
print("TEST SET 2: STRING FORMAT SPECIFICATIONS")
print("#" * 80)

table2 = Table([(1.23875234858e-24, 3.2348748432e-15), (2, 4)], names=('a', 'b'))
test_scenario(
    "Scientific notation with string format",
    table2,
    formats={'a': '.2e'},
    expected_values=['1.24e-24', '3.23e-15']
)

# Test 3: Multiple column formats
print("\n" + "#" * 80)
print("TEST SET 3: MULTIPLE COLUMN FORMATS")
print("#" * 80)

table3 = Table([
    (1.23875234858e-24, 3.2348748432e-15),
    (2, 4),
    (99.999, 123.456)
], names=('a', 'b', 'c'))
test_scenario(
    "Multiple columns with different formats",
    table3,
    formats={'a': lambda x: f"{x:.2e}", 'b': lambda x: f"{x:.1f}"},
    expected_values=['1.24e-24', '3.23e-15', '2.0', '4.0']
)

# Test 4: Large numbers
print("\n" + "#" * 80)
print("TEST SET 4: LARGE NUMBERS")
print("#" * 80)

table4 = Table([[1234567890.123], [9876543210.456]], names=('a', 'b'))
test_scenario(
    "Large numbers with decimal format",
    table4,
    formats={'a': lambda x: f"{x:.2f}"},
    expected_values=['1234567890.12']
)

# Test 5: Negative numbers
print("\n" + "#" * 80)
print("TEST SET 5: NEGATIVE NUMBERS")
print("#" * 80)

table5 = Table([[-1.23875234858e-24], [-3.2348748432e-15]], names=('a', 'b'))
test_scenario(
    "Negative scientific notation",
    table5,
    formats={'a': lambda x: f"{x:.2e}"},
    expected_values=['-1.24e-24', '-3.23e-15']
)

# Test 6: Check if col.info.format gets set when using formats parameter
print("\n" + "#" * 80)
print("TEST SET 6: CHECKING col.info.format ASSIGNMENT")
print("#" * 80)

table6 = Table([[1.23875234858e-24], [3.2348748432e-15]], names=('a', 'b'))

print("\nBefore write with formats parameter:")
for col_name in table6.colnames:
    col = table6[col_name]
    print(f"  {col_name}: col.info.format = {col.info.format}")

with tempfile.TemporaryDirectory() as tmpdir:
    html_path = os.path.join(tmpdir, 'test.html')
    table6.write(html_path, formats={'a': lambda x: f"{x:.2e}"}, overwrite=True)

print("\nAfter write with formats parameter:")
for col_name in table6.colnames:
    col = table6[col_name]
    print(f"  {col_name}: col.info.format = {col.info.format}")

print("\n(Note: The formats parameter is passed at write time, not stored in col.info)")

# Test 7: Verify formats parameter is applied without modifying original table
print("\n" + "#" * 80)
print("TEST SET 7: FORMATS PARAMETER DOES NOT MODIFY ORIGINAL TABLE")
print("#" * 80)

table7 = Table([[1.23875234858e-24, 2], [3.2348748432e-15, 4]], names=('a', 'b'))

print("\nOriginal table:")
print(table7)

with tempfile.TemporaryDirectory() as tmpdir:
    html_path = os.path.join(tmpdir, 'test.html')
    table7.write(html_path, formats={'a': lambda x: f"{x:.2e}"}, overwrite=True)

print("\nTable after write with formats parameter:")
print(table7)
print("(Should be unchanged)")
