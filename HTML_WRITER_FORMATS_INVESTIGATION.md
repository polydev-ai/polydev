# HTML Writer Formats Parameter - Complete Flow Investigation

## Overview

This document traces the complete flow of how the `formats` parameter is passed to and used by the HTML writer in astropy.io.ascii. The investigation confirms that the HTML writer **correctly receives and respects the formats parameter**.

---

## 1. The _get_writer Function (astropy/io/ascii/core.py:1800)

### Function Signature
```python
def _get_writer(writer_cls, fast_writer, **kwargs):
    """Initialize a table writer allowing for common customizations."""
```

### Key Points

#### A. Formats Handling (lines 1833-1834)
```python
if "formats" in kwargs:
    writer.data.formats = kwargs["formats"]
```

**This is the critical line!** The formats dict is extracted from kwargs and assigned directly to `writer.data.formats`.

#### B. Writer Initialization (lines 1815-1822)
```python
# A value of None for fill_values imply getting the default string
# representation of masked values (depending on the writer class), but the
# machinery expects a list.  The easiest here is to just pop the value off,
# i.e. fill_values=None is the same as not providing it at all.
if "fill_values" in kwargs and kwargs["fill_values"] is None:
    del kwargs["fill_values"]

if issubclass(writer_cls, FastBasic):  # Fast writers handle args separately
    return writer_cls(**kwargs)
elif fast_writer and f"fast_{writer_cls._format_name}" in FAST_CLASSES:
    # Switch to fast writer
    kwargs["fast_writer"] = fast_writer
    return FAST_CLASSES[f"fast_{writer_cls._format_name}"](**kwargs)

writer_kwargs = {k: v for k, v in kwargs.items() if k not in extra_writer_pars}
writer = writer_cls(**writer_kwargs)
```

**Important:** The `extra_writer_pars` tuple (defined at line 1785) includes `"formats"`, which means:
1. Formats is NOT passed to the writer_cls constructor
2. Instead, it's handled specially AFTER writer instantiation
3. This applies to ALL writers, including HTML

#### C. Extra Writer Parameters (lines 1785-1797)
```python
extra_writer_pars = (
    "delimiter",      # Line 1786
    "comment",        # Line 1787
    "quotechar",      # Line 1788
    "formats",        # Line 1789 <-- HERE
    "strip_whitespace",
    "names",
    "include_names",
    "exclude_names",
    "fill_values",
    "fill_include_names",
    "fill_exclude_names",
)
```

---

## 2. The HTML Class (astropy/io/ascii/html.py:260)

### Class Definition
```python
class HTML(core.BaseReader):
    """HTML format table."""

    _format_name = "html"
    header_class = HTMLHeader
    data_class = HTMLData
    inputter_class = HTMLInputter
    max_ndim = 2  # HTML supports 2-d columns
```

### Key Points

1. **Inheritance**: HTML inherits from `core.BaseReader`, NOT a BaseWriter
   - BaseReader is used for BOTH reading and writing
   - Both have `read()` and `write()` methods

2. **Uses HTMLData**: The data_class is set to HTMLData (from html.py:221)
   ```python
   class HTMLData(core.BaseData):
       splitter_class = HTMLSplitter
       # ... other methods ...
   ```

3. **Custom write() Method**: HTML has its own write() method (line 354)
   ```python
   def write(self, table):
       """Return data in ``table`` converted to HTML as a list of strings."""
       # Check that table has only 1-d or 2-d columns
       self._check_multidim_table(table)

       cols = list(table.columns.values())

       self.data.header.cols = cols
       self.data.cols = cols

       if isinstance(self.data.fill_values, tuple):
           self.data.fill_values = [self.data.fill_values]

       self.data._set_fill_values(cols)
       self.data._set_col_formats()  # <-- APPLIES FORMATS HERE (line 370)
       # ... rest of write method ...
   ```

---

## 3. The get_writer Function (astropy/io/ascii/ui.py:962)

### Function Signature
```python
def get_writer(writer_cls=None, fast_writer=True, **kwargs):
    """Initialize a table writer allowing for common customizations."""
    if writer_cls is None:
        writer_cls = basic.Basic
    if "strip_whitespace" not in kwargs:
        kwargs["strip_whitespace"] = True
    writer = core._get_writer(writer_cls, fast_writer, **kwargs)  # Line 1001
    # ... handle commented_header special case ...
    return writer
```

### Key Points
- Simply delegates to `core._get_writer()` with all kwargs passed through
- Ensures `strip_whitespace` defaults to True
- Returns the configured writer instance

---

## 4. The write() Function (astropy/io/ascii/ui.py:1021)

### Relevant Code Section (lines 1080-1086)
```python
writer_cls = _get_format_class(format)  # Line 1080
writer = get_writer(writer_cls=writer_cls, fast_writer=fast_writer, **kwargs)  # Line 1081
if writer._format_name in core.FAST_CLASSES:  # Line 1082
    writer.write(table, output)  # Line 1083
    return

lines = writer.write(table)  # Line 1086
```

### Key Points
1. `format='html'` is used to get the HTML writer class
2. All kwargs (including `formats`) are passed to `get_writer()`
3. HTML is NOT in FAST_CLASSES, so line 1086 is executed: `writer.write(table)`
4. The writer's write() method is called with just the table

---

## 5. Format Application - _set_col_formats() (astropy/io/ascii/core.py:973)

### Method Definition
```python
def _set_col_formats(self):
    """WRITE: set column formats."""
    for col in self.cols:
        if col.info.name in self.formats:
            col.info.format = self.formats[col.info.name]
```

### How It Works
1. **Iterates through all columns** in `self.cols`
2. **Checks if column name is in formats dict** (`self.formats`)
3. **Assigns the format** to `col.info.format` if found
4. This format is then used by `col.info.iter_str_vals()` to format each value

### When It's Called
For HTML specifically (html.py:370):
```python
self.data._set_col_formats()
```

For other writers (BaseData.str_vals at line 947):
```python
self._set_col_formats()
```

---

## 6. Complete Flow Diagram

```
User Code:
  table.write('output.html', format='html', formats={'col': 'fmt'})
        |
        v
ui.write()  (ui.py:1021)
        |
        ├─> _get_format_class('html')  --> HTML class
        |
        ├─> get_writer(writer_cls=HTML, fast_writer=True,
        |              format='html', formats={'col': 'fmt'}, ...)
        |         |
        |         v
        |    core._get_writer(HTML, True,
        |                     format='html', formats={'col': 'fmt'}, ...)
        |         |
        |         ├─> writer = HTML()
        |         |
        |         └─> IF "formats" in kwargs:
        |               writer.data.formats = kwargs["formats"]
        |               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        |               FORMATS ASSIGNED HERE!
        |
        ├─> writer.write(table)  --> HTML.write(table)
        |         |
        |         ├─> self.data._set_col_formats()
        |         |    (Iterates through cols, sets col.info.format)
        |         |
        |         ├─> col.info.iter_str_vals()
        |         |    (Uses col.info.format to format each value)
        |         |
        |         └─> Returns formatted HTML as list of strings
        |
        └─> Write HTML output to file
```

---

## 7. Summary of Key Points

| Aspect | Details |
|--------|---------|
| **Parameter Passing** | `formats` dict passed through all function calls via `**kwargs` |
| **Assignment Location** | `_get_writer()` at line 1833: `writer.data.formats = kwargs["formats"]` |
| **Writer Class** | HTML inherits from BaseReader (used for both read and write) |
| **Format Application** | `HTML.write()` calls `self.data._set_col_formats()` at line 370 |
| **Format Usage** | Applied to `col.info.format` before calling `col.info.iter_str_vals()` |
| **HTML Specific** | HTML writer is NOT a fast writer, uses standard format application |

---

## 8. Code Snippet Summary

### Key Code Section 1: Parameter Initialization in _get_writer()
**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`
**Lines:** 1833-1834

```python
if "formats" in kwargs:
    writer.data.formats = kwargs["formats"]
```

### Key Code Section 2: Format Application in HTML.write()
**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/html.py`
**Line:** 370

```python
self.data._set_col_formats()
```

### Key Code Section 3: Actual Format Assignment in _set_col_formats()
**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`
**Lines:** 973-977

```python
def _set_col_formats(self):
    """WRITE: set column formats."""
    for col in self.cols:
        if col.info.name in self.formats:
            col.info.format = self.formats[col.info.name]
```

---

## 9. Verification

The test results in `/Users/venkat/Documents/polydev-ai/TEST_RESULTS_SUMMARY.md` confirm:

✓ HTML writer correctly receives the `formats` parameter
✓ Formats are properly applied to specified columns
✓ Formatted values appear in output, unformatted values do not
✓ Both lambda and string format specifications work
✓ Format is applied consistently across HTML and CSV writers

---

## Conclusion

The HTML writer **correctly receives and respects the formats parameter**. The flow is:

1. User provides `formats={'col': fmt}` to `table.write()`
2. Parameter passes through `write()` → `get_writer()` → `_get_writer()` via kwargs
3. In `_get_writer()`, the formats dict is assigned to `writer.data.formats`
4. When `HTML.write()` is called, it calls `self.data._set_col_formats()`
5. This method assigns each format to its corresponding column's `col.info.format`
6. The column's `iter_str_vals()` method uses this format to format values
7. Formatted values are written to the HTML output

The mechanism works perfectly for the HTML writer.
