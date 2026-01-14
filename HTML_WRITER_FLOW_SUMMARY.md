# HTML Writer Formats Parameter - Complete Flow Analysis

## Executive Summary

The investigation confirms that the HTML writer **correctly receives and applies the formats parameter**. The flow is well-designed and works as intended. The debug output below traces the complete path from user code to formatted HTML output.

---

## Debug Output Analysis

### Step 1: User Calls table.write() with formats

```
Calling: table.write('/path/to/test.html', formats={'a': format_func}, overwrite=True)
```

### Step 2: _get_writer() Receives Formats in kwargs

```
DEBUG: _get_writer() called
================================================================================
  writer_cls: HTML
  fast_writer: True
  kwargs keys: ['formats', 'strip_whitespace']
  *** FORMATS FOUND IN KWARGS ***
      formats = {'a': <function <lambda> at 0x10557ba60>}
```

**Key Finding:** The formats dict is present in kwargs at this point.

### Step 3: Writer Created and Formats Assigned

```
DEBUG: After writer creation
  writer.data class: HTMLData
  writer.data.formats: {'a': <function <lambda> at 0x10557ba60>}
    *** FORMATS SUCCESSFULLY ASSIGNED TO writer.data.formats ***
```

**Key Finding:** After `_get_writer()` completes, `writer.data.formats` contains the formats dict.

### Step 4: HTML.write() Called with Formats Already Set

```
DEBUG: HTML.write() called
================================================================================
  table: ['a', 'b']
  self.data class: HTMLData
  self.data.formats BEFORE _set_col_formats: {'a': <function <lambda> at 0x10557ba60>}
```

**Key Finding:** HTML.write() receives the writer with formats already assigned.

### Step 5: _set_col_formats() Applies Formats to Columns

```
DEBUG: _set_col_formats() called
================================================================================
  self class: HTMLData
  self.formats: {'a': <function <lambda> at 0x10557ba60>}
  self.cols: ['a', 'b']
  Column 'a': format changed from None to <function <lambda> at 0x10557ba60>
    *** FORMAT ASSIGNED TO COLUMN ***
  Column 'b': no format in self.formats (unchanged)
```

**Key Finding:** The format is assigned to column 'a' but not to column 'b', as expected.

### Step 6: Column Formats After Application

```
  Column formats AFTER _set_col_formats:
    Column 'a': col.info.format = <function <lambda> at 0x10557ba60>
    Column 'b': col.info.format = None
```

**Key Finding:** Column 'a' now has the format function assigned.

### Step 7: Final HTML Output

```html
<html>
 <head>
  <meta charset="utf-8"/>
  <meta content="text/html;charset=UTF-8" http-equiv="Content-type"/>
 </head>
 <body>
  <table>
   <thead>
    <tr>
     <th>a</th>
     <th>b</th>
    </tr>
   </thead>
   <tr>
    <td>1.24e-24</td>      <!-- Formatted! -->
    <td>2</td>              <!-- Not formatted (column 'b') -->
   </tr>
   <tr>
    <td>3.23e-15</td>       <!-- Formatted! -->
    <td>4</td>              <!-- Not formatted (column 'b') -->
   </tr>
  </table>
 </body>
</html>
```

**Key Finding:** The HTML output shows formatted values (1.24e-24 and 3.23e-15) instead of raw values.

### Step 8: Verification Results

```
================================================================================
VERIFICATION
================================================================================
✓ PASS: Found formatted value '1.24e-24' in HTML
✓ PASS: Found formatted value '3.23e-15' in HTML
✓ PASS: Unformatted value '1.23875234858e-24' NOT found
✓ PASS: Unformatted value '3.2348748432e-15' NOT found
```

**Key Finding:** All verifications pass - formats are working correctly.

---

## Code Flow with Line Numbers

### Phase 1: Parameter Passing (astropy/io/ascii/ui.py)

```
write() - Line 1021
  ↓
  _get_format_class(format)  → HTML class
  ↓
  get_writer(writer_cls=HTML, fast_writer=True, **kwargs)  - Line 1081
    ↓ (kwargs includes 'formats')
```

### Phase 2: Writer Initialization (astropy/io/ascii/core.py)

```
_get_writer(writer_cls=HTML, fast_writer=True, **kwargs)  - Line 1800
  ↓
  writer = HTML()  - Line 1822
  ↓
  if "formats" in kwargs:
      writer.data.formats = kwargs["formats"]  - Line 1834
  ↓
  return writer
```

### Phase 3: HTML Write Operation (astropy/io/ascii/html.py)

```
HTML.write(table)  - Line 354
  ↓
  self.data._set_col_formats()  - Line 370
    ↓ (calls)
    → core.BaseData._set_col_formats()  - core.py Line 973
      ↓
      for col in self.cols:
          if col.info.name in self.formats:
              col.info.format = self.formats[col.info.name]  - Line 977
  ↓
  col.info.iter_str_vals()  - Formats values using col.info.format
  ↓
  Return formatted HTML
```

---

## Key Code Snippets

### 1. Format Assignment in _get_writer() (core.py:1833-1834)

```python
if "formats" in kwargs:
    writer.data.formats = kwargs["formats"]
```

**Location:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`

**Line:** 1833-1834

**What it does:** Assigns the formats dict from kwargs to the writer's data attribute.

---

### 2. Format Application in _set_col_formats() (core.py:973-977)

```python
def _set_col_formats(self):
    """WRITE: set column formats."""
    for col in self.cols:
        if col.info.name in self.formats:
            col.info.format = self.formats[col.info.name]
```

**Location:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`

**Lines:** 973-977

**What it does:** Iterates through columns and assigns format to each column whose name is in the formats dict.

---

### 3. HTML.write() Calling _set_col_formats() (html.py:354-370)

```python
def write(self, table):
    """Return data in ``table`` converted to HTML as a list of strings."""
    # ... setup code ...

    self.data._set_fill_values(cols)
    self.data._set_col_formats()  # <-- CRITICAL LINE

    # ... rest of write method uses col.info.format via col.info.iter_str_vals() ...
```

**Location:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/html.py`

**Lines:** 354-370

**What it does:** Calls _set_col_formats() to apply formats before generating HTML output.

---

### 4. Extra Writer Parameters Definition (core.py:1785-1797)

```python
extra_writer_pars = (
    "delimiter",
    "comment",
    "quotechar",
    "formats",              # <-- HERE (Line 1789)
    "strip_whitespace",
    "names",
    "include_names",
    "exclude_names",
    "fill_values",
    "fill_include_names",
    "fill_exclude_names",
)
```

**Location:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`

**Lines:** 1785-1797

**What it does:** Defines parameters that should not be passed to the writer class constructor, but should be handled specially in _get_writer().

---

## HTML Class Hierarchy

```
core.BaseReader (core.py:1320)
    ↓ inherits from
    ↓
HTML (html.py:260)
    - _format_name = "html"
    - data_class = HTMLData
    - def write(self, table)
    - def read(self, table)  # Also has read method
```

**Important:** HTML is not a separate BaseWriter class. It inherits from BaseReader, which is used for both reading and writing depending on context.

---

## Why the HTML Writer Works Correctly

1. **Parameter Passing:** The `formats` parameter is part of `extra_writer_pars`, so it's handled specially in `_get_writer()` rather than passed to the constructor.

2. **Assignment Point:** At line 1834 in `_get_writer()`, the formats dict is assigned to `writer.data.formats` AFTER the writer object is created.

3. **HTMLData Inheritance:** HTMLData inherits from BaseData, which includes the `_set_col_formats()` method and the `formats` attribute.

4. **Format Application:** HTML.write() explicitly calls `self.data._set_col_formats()` at line 370, which applies the formats to columns before generating output.

5. **Value Formatting:** The Column's `iter_str_vals()` method uses `col.info.format` to format each value before it's written to the HTML.

---

## Potential Issues (Not Found)

The investigation checked for:

1. ✓ Is formats in kwargs? **YES** - confirmed in debug output
2. ✓ Is formats assigned to writer.data.formats? **YES** - confirmed in debug output
3. ✓ Is _set_col_formats() called? **YES** - confirmed in debug output
4. ✓ Are formats applied to columns? **YES** - confirmed in debug output
5. ✓ Are formatted values in output? **YES** - confirmed in HTML output

**No issues found.** The mechanism works perfectly.

---

## Conclusion

The HTML writer correctly receives and applies the `formats` parameter through the following mechanism:

1. User passes `formats` to `table.write()`
2. Parameter travels through `write()` → `get_writer()` → `_get_writer()` via `**kwargs`
3. In `_get_writer()`, it's assigned to `writer.data.formats`
4. HTML.write() calls `self.data._set_col_formats()` which assigns format to each column
5. Columns use their format when generating output strings
6. HTML output contains properly formatted values

The design is correct and intentional, allowing writers to receive and apply format specifications consistently across all format types.

---

## Files Analyzed

| File | Location | Lines |
|------|----------|-------|
| core.py | `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py` | 1785-1797, 1800-1861, 973-977 |
| ui.py | `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/ui.py` | 962-1018, 1021-1100 |
| html.py | `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/html.py` | 260-482 |

## Test Files Created

| File | Purpose |
|------|---------|
| `/Users/venkat/Documents/polydev-ai/test_html_writer_debug.py` | Debug test with monkey-patched methods showing complete flow |
| `/Users/venkat/Documents/polydev-ai/HTML_WRITER_FORMATS_INVESTIGATION.md` | Detailed investigation document |
| `/Users/venkat/Documents/polydev-ai/HTML_WRITER_FLOW_SUMMARY.md` | This summary document |

---

## Debug Test Output

The debug test (`test_html_writer_debug.py`) produced the following key outputs:

1. ✓ Formats found in kwargs during `_get_writer()` call
2. ✓ Formats successfully assigned to `writer.data.formats`
3. ✓ Formats available in `HTML.write()` method
4. ✓ Formats applied to columns by `_set_col_formats()`
5. ✓ Formatted values appear in final HTML output
6. ✓ All verification checks pass

This confirms the HTML writer works as designed and expected.
