#!/usr/bin/env python3
"""
Debug test to trace the HTML writer formats parameter flow.

This test adds debug output at key points to show how the formats parameter
is passed through the system and applied by the HTML writer.
"""

import sys
import tempfile
import os
from astropy.table import Table
from astropy.io.ascii import core, ui

# Monkey-patch to add debug output at key points
original_get_writer = core._get_writer
original_set_col_formats = core.BaseData._set_col_formats
original_html_write = None  # Will be set after import

def debug_get_writer(writer_cls, fast_writer, **kwargs):
    """Wrapper around _get_writer with debug output."""
    print("\n" + "="*80)
    print("DEBUG: _get_writer() called")
    print("="*80)
    print(f"  writer_cls: {writer_cls.__name__}")
    print(f"  fast_writer: {fast_writer}")
    print(f"  kwargs keys: {list(kwargs.keys())}")
    if "formats" in kwargs:
        print(f"  *** FORMATS FOUND IN KWARGS ***")
        print(f"      formats = {kwargs['formats']}")
    else:
        print(f"  *** NO FORMATS IN KWARGS ***")

    # Call original function
    writer = original_get_writer(writer_cls, fast_writer, **kwargs)

    # Debug output AFTER writer creation
    print("\nDEBUG: After writer creation")
    print(f"  writer.data class: {writer.data.__class__.__name__}")
    print(f"  writer.data.formats: {writer.data.formats}")
    if writer.data.formats:
        print(f"    *** FORMATS SUCCESSFULLY ASSIGNED TO writer.data.formats ***")

    return writer

def debug_set_col_formats(self):
    """Wrapper around _set_col_formats with debug output."""
    print("\n" + "="*80)
    print("DEBUG: _set_col_formats() called")
    print("="*80)
    print(f"  self class: {self.__class__.__name__}")
    print(f"  self.formats: {self.formats}")
    print(f"  self.cols: {[col.info.name for col in self.cols]}")

    # Process each column
    for col in self.cols:
        before = col.info.format
        if col.info.name in self.formats:
            col.info.format = self.formats[col.info.name]
            after = col.info.format
            print(f"  Column '{col.info.name}': format changed from {before} to {after}")
            print(f"    *** FORMAT ASSIGNED TO COLUMN ***")
        else:
            print(f"  Column '{col.info.name}': no format in self.formats (unchanged)")

def debug_html_write(self, table):
    """Wrapper around HTML.write() with debug output."""
    print("\n" + "="*80)
    print("DEBUG: HTML.write() called")
    print("="*80)
    print(f"  table: {table.colnames}")
    print(f"  self.data class: {self.data.__class__.__name__}")
    print(f"  self.data.formats BEFORE _set_col_formats: {self.data.formats}")

    # Call original HTML.write() but with our debug wrapper
    from astropy.io.ascii import html

    # Check multidim
    self._check_multidim_table(table)

    cols = list(table.columns.values())

    self.data.header.cols = cols
    self.data.cols = cols

    if isinstance(self.data.fill_values, tuple):
        self.data.fill_values = [self.data.fill_values]

    self.data._set_fill_values(cols)

    # THIS IS THE KEY CALL - with our debug wrapper
    print("\nDEBUG: About to call self.data._set_col_formats()")
    self.data._set_col_formats()
    print("DEBUG: self.data._set_col_formats() completed")

    # Show column formats after
    print(f"\n  Column formats AFTER _set_col_formats:")
    for col in cols:
        print(f"    Column '{col.info.name}': col.info.format = {col.info.format}")

    # Continue with the rest of the write method
    lines = []

    raw_html_cols = self.html.get("raw_html_cols", [])
    if isinstance(raw_html_cols, str):
        raw_html_cols = [raw_html_cols]
    cols_escaped = [col.info.name not in raw_html_cols for col in cols]

    raw_html_clean_kwargs = self.html.get("raw_html_clean_kwargs", {})

    from astropy.utils.xml import writer
    from astropy.io.ascii.html import ListWriter

    w = writer.XMLWriter(ListWriter(lines))

    with w.tag("html"):
        with w.tag("head"):
            with w.tag("meta", attrib={"charset": "utf-8"}):
                pass
            with w.tag("meta", attrib={
                "http-equiv": "Content-type",
                "content": "text/html;charset=UTF-8",
            }):
                pass
            if "css" in self.html:
                with w.tag("style"):
                    w.data(self.html["css"])

        with w.tag("body"):
            if isinstance(self.html["table_id"], str):
                html_table_id = self.html["table_id"]
            else:
                html_table_id = None

            if "table_class" in self.html:
                html_table_class = self.html["table_class"]
                attrib = {"class": html_table_class}
            else:
                attrib = {}

            with w.tag("table", id=html_table_id, attrib=attrib):
                with w.tag("thead"):
                    with w.tag("tr"):
                        for col in cols:
                            if len(col.shape) > 1 and self.html["multicol"]:
                                w.start("th", colspan=col.shape[1])
                            else:
                                w.start("th")
                            w.data(col.info.name.strip())
                            w.end(indent=False)

                    col_str_iters = []
                    new_cols_escaped = []
                    new_cols = []

                    for col, col_escaped in zip(cols, cols_escaped):
                        if len(col.shape) > 1 and self.html["multicol"]:
                            span = col.shape[1]
                            from astropy.table import Column
                            for i in range(span):
                                new_col = Column([el[i] for el in col])
                                new_col_iter_str_vals = self.fill_values(
                                    col, new_col.info.iter_str_vals()
                                )
                                col_str_iters.append(new_col_iter_str_vals)
                                new_cols_escaped.append(col_escaped)
                                new_cols.append(new_col)
                        else:
                            col_iter_str_vals = self.fill_values(
                                col, col.info.iter_str_vals()
                            )
                            col_str_iters.append(col_iter_str_vals)
                            new_cols_escaped.append(col_escaped)

                for row in zip(*col_str_iters):
                    with w.tag("tr"):
                        for el, col_escaped in zip(row, new_cols_escaped):
                            method = "escape_xml" if col_escaped else "bleach_clean"
                            with w.xml_cleaning_method(method, **raw_html_clean_kwargs):
                                w.start("td")
                                w.data(el.strip())
                                w.end(indent=False)

    return ["".join(lines)]

# Apply patches
core._get_writer = debug_get_writer
core.BaseData._set_col_formats = debug_set_col_formats

# Import HTML after patching core
from astropy.io.ascii.html import HTML
original_html_write = HTML.write
HTML.write = debug_html_write

print("="*80)
print("HTML WRITER FORMATS DEBUG TEST")
print("="*80)

# Create test table
data = [(1.23875234858e-24, 3.2348748432e-15), (2, 4)]
table = Table(data, names=('a', 'b'))

print("\nTest Table:")
print(table)

# Define format function
format_func = lambda x: f"{x:.2e}"

print("\n" + "="*80)
print("CALLING table.write() WITH formats PARAMETER")
print("="*80)

# Write to HTML with formats
with tempfile.TemporaryDirectory() as tmpdir:
    html_path = os.path.join(tmpdir, 'test.html')

    print(f"\nCalling: table.write('{html_path}', formats={{'a': format_func}}, overwrite=True)")
    table.write(html_path, formats={'a': format_func}, overwrite=True)

    # Read and display HTML content
    with open(html_path, 'r') as f:
        html_content = f.read()

    print("\n" + "="*80)
    print("HTML OUTPUT")
    print("="*80)
    print(html_content)

    print("\n" + "="*80)
    print("VERIFICATION")
    print("="*80)

    if "1.24e-24" in html_content:
        print("✓ PASS: Found formatted value '1.24e-24' in HTML")
    else:
        print("✗ FAIL: Expected formatted value '1.24e-24' NOT found")

    if "3.23e-15" in html_content:
        print("✓ PASS: Found formatted value '3.23e-15' in HTML")
    else:
        print("✗ FAIL: Expected formatted value '3.23e-15' NOT found")

    if "1.23875234858e-24" in html_content:
        print("✗ FAIL: Found unformatted value '1.23875234858e-24' in HTML")
    else:
        print("✓ PASS: Unformatted value '1.23875234858e-24' NOT found")

    if "3.2348748432e-15" in html_content:
        print("✗ FAIL: Found unformatted value '3.2348748432e-15' in HTML")
    else:
        print("✓ PASS: Unformatted value '3.2348748432e-15' NOT found")

print("\n" + "="*80)
print("DEBUG TEST COMPLETE")
print("="*80)
