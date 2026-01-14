# HTML Writer Formats Parameter - Actual Code Snippets with Context

## 1. core.py: _get_writer() Function

**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`

### Extra Writer Parameters (Lines 1785-1797)

```python
extra_writer_pars = (
    "delimiter",
    "comment",
    "quotechar",
    "formats",                  # <-- Formats is handled specially
    "strip_whitespace",
    "names",
    "include_names",
    "exclude_names",
    "fill_values",
    "fill_include_names",
    "fill_exclude_names",
)
```

**Significance:** This tuple defines parameters that should NOT be passed to the writer class constructor. Instead, they're handled specially in `_get_writer()`.

---

### _get_writer() Function (Lines 1800-1861)

```python
def _get_writer(writer_cls, fast_writer, **kwargs):
    """Initialize a table writer allowing for common customizations. This
    routine is for internal (package) use only and is useful because it depends
    only on the "core" module.
    """
    from .fastbasic import FastBasic

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

    if "delimiter" in kwargs:
        writer.header.splitter.delimiter = kwargs["delimiter"]
        writer.data.splitter.delimiter = kwargs["delimiter"]
    if "comment" in kwargs:
        writer.header.write_comment = kwargs["comment"]
        writer.data.write_comment = kwargs["comment"]
    if "quotechar" in kwargs:
        writer.header.splitter.quotechar = kwargs["quotechar"]
        writer.data.splitter.quotechar = kwargs["quotechar"]
    if "formats" in kwargs:                            # <-- HERE IS THE KEY CHECK
        writer.data.formats = kwargs["formats"]        # <-- FORMATS ASSIGNED
    if "strip_whitespace" in kwargs:
        if kwargs["strip_whitespace"]:
            # Restore the default SplitterClass process_val method which strips
            # whitespace.  This may have been changed in the Writer
            # initialization (e.g. Rdb and Tab)
            writer.data.splitter.process_val = operator.methodcaller("strip", " \t")
        else:
            writer.data.splitter.process_val = None
    if "names" in kwargs:
        writer.header.names = kwargs["names"]
    if "include_names" in kwargs:
        writer.include_names = kwargs["include_names"]
    if "exclude_names" in kwargs:
        writer.exclude_names = kwargs["exclude_names"]
    if "fill_values" in kwargs:
        # Prepend user-specified values to the class default.
        with suppress(TypeError, IndexError):
            # Test if it looks like (match, replace_string, optional_colname),
            # in which case make it a list
            kwargs["fill_values"][1] + ""
            kwargs["fill_values"] = [kwargs["fill_values"]]
        writer.data.fill_values = kwargs["fill_values"] + writer.data.fill_values
    if "fill_include_names" in kwargs:
        writer.data.fill_include_names = kwargs["fill_include_names"]
    if "fill_exclude_names" in kwargs:
        writer.data.fill_exclude_names = kwargs["fill_exclude_names"]
    return writer
```

**Critical Lines:** 1833-1834
- **Line 1833:** Checks if "formats" is in kwargs
- **Line 1834:** Assigns kwargs["formats"] to writer.data.formats

---

## 2. core.py: BaseData._set_col_formats() Method

**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/core.py`

### BaseData Class Declaration (Line 781)

```python
class BaseData:
```

### Formats Attribute (Lines 798-806)

```python
class BaseData:
    # ... other class attributes ...
    formats = {}                           # <-- CLASS ATTRIBUTE

    def __init__(self):
        # Need to make sure fill_values list is instance attribute, not class attribute.
        # On read, this will be overwritten by the default in the ui.read (thus, in
        # the current implementation there can be no different default for different
        # Readers). On write, ui.py does not specify a default, so this line here matters.
        self.fill_values = copy.copy(self.fill_values)
        self.formats = copy.copy(self.formats)        # <-- INSTANCE ATTRIBUTE
        self.splitter = self.splitter_class()
```

---

### _set_col_formats() Method (Lines 973-977)

```python
def _set_col_formats(self):
    """WRITE: set column formats."""
    for col in self.cols:
        if col.info.name in self.formats:
            col.info.format = self.formats[col.info.name]
```

**What it does:**
1. Iterates through all columns in `self.cols`
2. For each column, checks if its name is a key in `self.formats`
3. If found, assigns the format to `col.info.format`
4. The format is then used by `col.info.iter_str_vals()` to format values

---

## 3. ui.py: get_writer() Function

**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/ui.py`

### get_writer() Function (Lines 962-1018)

```python
def get_writer(writer_cls=None, fast_writer=True, **kwargs):
    """
    Initialize a table writer allowing for common customizations.

    Most of the default behavior for various parameters is determined by the Writer
    class.

    Parameters
    ----------
    writer_cls : ``writer_cls``
        Writer class. Defaults to :class:`Basic`.
    delimiter : str
        Column delimiter string
    comment : str
        String defining a comment line in table
    quotechar : str
        One-character string to quote fields containing special characters
    formats : dict
        Dictionary of format specifiers or formatting functions
    strip_whitespace : bool
        Strip surrounding whitespace from column values.
    names : list
        List of names corresponding to each data column
    include_names : list
        List of names to include in output.
    exclude_names : list
        List of names to exclude from output (applied after ``include_names``)
    fast_writer : bool
        Whether to use the fast Cython writer.

    Returns
    -------
    writer : `~astropy.io.ascii.BaseReader` subclass
        ASCII format writer instance
    """
    if writer_cls is None:
        writer_cls = basic.Basic
    if "strip_whitespace" not in kwargs:
        kwargs["strip_whitespace"] = True
    writer = core._get_writer(writer_cls, fast_writer, **kwargs)  # <-- DELEGATES TO CORE

    # Handle the corner case of wanting to disable writing table comments for the
    # commented_header format.  This format *requires* a string for `write_comment`
    # because that is used for the header column row, so it is not possible to
    # set the input `comment` to None.  Without adding a new keyword or assuming
    # a default comment character, there is no other option but to tell user to
    # simply remove the meta['comments'].
    if isinstance(
        writer, (basic.CommentedHeader, fastbasic.FastCommentedHeader)
    ) and not isinstance(kwargs.get("comment", ""), str):
        raise ValueError(
            "for the commented_header writer you must supply a string\n"
            "value for the `comment` keyword.  In order to disable writing\n"
            "table comments use `del t.meta['comments']` prior to writing."
        )

    return writer
```

**Critical Line:** 1001
- Calls `core._get_writer()` with all kwargs passed through (including formats)

---

### write() Function (Lines 1021-1100)

```python
def write(
    table,
    output=None,
    format=None,
    fast_writer=True,
    *,
    overwrite=False,
    **kwargs,
):
    # Docstring inserted below

    # Specifically block the legacy `writer_cls` kwarg, which will otherwise cause a confusing
    # exception later in the call to get_writer().
    if "writer_cls" in kwargs:
        raise TypeError("write() got an unexpected keyword argument 'writer_cls'")

    _validate_read_write_kwargs(
        "write", format=format, fast_writer=fast_writer, overwrite=overwrite, **kwargs
    )

    if isinstance(output, (str, bytes, os.PathLike)):
        output = os.path.expanduser(output)  # noqa: PTH111
        if not overwrite and os.path.lexists(output):
            raise OSError(NOT_OVERWRITING_MSG.format(output))

    if output is None:
        output = sys.stdout

    # Ensure that `table` is a Table subclass.
    names = kwargs.get("names")
    if isinstance(table, Table):
        # While we are only going to read data from columns, we may need to
        # to adjust info attributes such as format, so we make a shallow copy.
        table = table.__class__(table, names=names, copy=False)
    else:
        # Otherwise, create a table from the input.
        table = Table(table, names=names, copy=False)

    table0 = table[:0].copy()
    core._apply_include_exclude_names(
        table0,
        kwargs.get("names"),
        kwargs.get("include_names"),
        kwargs.get("exclude_names"),
    )
    diff_format_with_names = set(kwargs.get("formats", [])) - set(table0.colnames)

    if diff_format_with_names:
        warnings.warn(
            (
                f"The key(s) {diff_format_with_names} specified in the formats "
                "argument do not match a column name."
            ),
            AstropyWarning,
        )

    if table.has_mixin_columns:
        fast_writer = False

    writer_cls = _get_format_class(format)                           # <-- GET WRITER CLASS
    writer = get_writer(writer_cls=writer_cls, fast_writer=fast_writer, **kwargs)  # <-- GET WRITER (line 1081)
    if writer._format_name in core.FAST_CLASSES:
        writer.write(table, output)
        return

    lines = writer.write(table)                                       # <-- CALL WRITE

    # Write the lines to output
    outstr = os.linesep.join(lines)
    if not hasattr(output, "write"):
        # NOTE: we need to specify newline='', otherwise the default
        # behavior is for Python to translate \r\n (which we write because
        # of os.linesep) into \r\r\n. Specifying newline='' disables any
        # auto-translation.
        with open(output, "w", newline="") as output:
            output.write(outstr)
            output.write(os.linesep)
    else:
        output.write(outstr)
        output.write(os.linesep)
```

**Critical Lines:**
- **Line 1080:** `writer_cls = _get_format_class(format)` - Gets the HTML class
- **Line 1081:** `writer = get_writer(writer_cls=writer_cls, fast_writer=fast_writer, **kwargs)` - Creates writer with all kwargs
- **Line 1086:** `lines = writer.write(table)` - Calls the writer's write method

---

## 4. html.py: HTML Class and write() Method

**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/html.py`

### HTML Class Declaration (Lines 260-323)

```python
class HTML(core.BaseReader):
    """HTML format table.

    In order to customize input and output, a dict of parameters may
    be passed to this class holding specific customizations.

    .. note::
       Be aware that in many cases reading tables from published HTML journal articles will not work
       for a variety of reasons, including inconsistent mark-ups, CAPTCHAs, changing formats,
       embedded javascript, or the table actually being an image. If possible you should consider
       retrieving the table in a standard data format such as CSV or FITS, perhaps from an archive
       such as CDS/Vizier.

    **htmldict** : Dictionary of parameters for HTML input/output.
        # ... documentation ...
    """

    _format_name = "html"
    _io_registry_format_aliases = ["html"]
    _io_registry_suffix = ".html"
    _description = "HTML table"

    header_class = HTMLHeader
    data_class = HTMLData                    # <-- USES HTMLData, which inherits from BaseData
    inputter_class = HTMLInputter

    max_ndim = 2  # HTML supports writing 2-d columns with shape (n, m)

    def __init__(self, htmldict={}):
        """
        Initialize classes for HTML reading and writing.
        """
        super().__init__()
        self.html = deepcopy(htmldict)
        if "multicol" not in htmldict:
            self.html["multicol"] = True
        if "table_id" not in htmldict:
            self.html["table_id"] = 1
        self.inputter.html = self.html
```

---

### HTML.write() Method (Lines 354-482)

```python
def write(self, table):
    """
    Return data in ``table`` converted to HTML as a list of strings.
    """
    # Check that table has only 1-d or 2-d columns. Above that fails.
    self._check_multidim_table(table)

    cols = list(table.columns.values())

    self.data.header.cols = cols
    self.data.cols = cols

    if isinstance(self.data.fill_values, tuple):
        self.data.fill_values = [self.data.fill_values]

    self.data._set_fill_values(cols)
    self.data._set_col_formats()             # <-- CRITICAL: APPLIES FORMATS (line 370)

    lines = []

    # Set HTML escaping to False for any column in the raw_html_cols input
    raw_html_cols = self.html.get("raw_html_cols", [])
    if isinstance(raw_html_cols, str):
        raw_html_cols = [raw_html_cols]  # Allow for a single string as input
    cols_escaped = [col.info.name not in raw_html_cols for col in cols]

    # Kwargs that get passed on to bleach.clean() if that is available.
    raw_html_clean_kwargs = self.html.get("raw_html_clean_kwargs", {})

    # Use XMLWriter to output HTML to lines
    w = writer.XMLWriter(ListWriter(lines))

    with w.tag("html"):
        with w.tag("head"):
            # ... head section ...
        with w.tag("body"):
            # ... body section with table ...
            with w.tag("table", id=html_table_id, attrib=attrib):
                # ... table headers ...
                # After _set_col_formats() is called above, columns now have formats set
                # so col.info.iter_str_vals() will use those formats to format values
                for col, col_escaped in zip(cols, cols_escaped):
                    # ... process columns ...
                    col_iter_str_vals = self.fill_values(
                        col, col.info.iter_str_vals()  # <-- USES FORMAT HERE
                    )
                # ... write rows ...

    # Fixes XMLWriter's insertion of unwanted line breaks
    return ["".join(lines)]
```

**Critical Lines:**
- **Line 370:** `self.data._set_col_formats()` - Applies the formats
- **Line 463:** `col.info.iter_str_vals()` - Uses the format to format values

---

## 5. HTMLData Class (html.py)

**File:** `/Users/venkat/Library/Python/3.11/lib/python/site-packages/astropy/io/ascii/html.py`

### HTMLData Class (Lines 221-257)

```python
class HTMLData(core.BaseData):
    splitter_class = HTMLSplitter

    def start_line(self, lines):
        """
        Return the line number at which table data begins.
        """
        for i, line in enumerate(lines):
            if not isinstance(line, SoupString):
                raise TypeError("HTML lines should be of type SoupString")
            soup = line.soup

            if soup.td is not None:
                if soup.th is not None:
                    raise core.InconsistentTableError(
                        "HTML tables cannot have headings and data in the same row"
                    )
                return i

        raise core.InconsistentTableError("No start line found for HTML data")

    def end_line(self, lines):
        """
        Return the line number at which table data ends.
        """
        last_index = -1

        for i, line in enumerate(lines):
            if not isinstance(line, SoupString):
                raise TypeError("HTML lines should be of type SoupString")
            soup = line.soup
            if soup.td is not None:
                last_index = i

        if last_index == -1:
            return None
        return last_index + 1
```

**Important:** HTMLData inherits from `core.BaseData`, which means it inherits:
- The `formats` attribute (class and instance)
- The `_set_col_formats()` method

---

## Summary Table

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| extra_writer_pars | core.py | 1785-1797 | Defines parameters handled specially (includes "formats") |
| _get_writer() | core.py | 1800-1861 | Assigns kwargs["formats"] to writer.data.formats (line 1834) |
| BaseData.formats | core.py | 798-806 | Class and instance attribute for storing formats |
| BaseData._set_col_formats() | core.py | 973-977 | Applies formats to columns |
| get_writer() | ui.py | 962-1018 | Calls core._get_writer() with all kwargs |
| write() | ui.py | 1021-1100 | Calls get_writer() and then writer.write() |
| HTML class | html.py | 260-323 | Inherits from BaseReader |
| HTML.write() | html.py | 354-482 | Calls self.data._set_col_formats() at line 370 |
| HTMLData | html.py | 221-257 | Inherits from BaseData (gets formats support) |

---

## Flow Visualization

```
User Code
    ↓
ui.write(..., format='html', formats={'a': fmt})
    ↓
_get_format_class('html') → HTML
    ↓
get_writer(writer_cls=HTML, ..., formats={'a': fmt})
    ↓
core._get_writer(HTML, ..., formats={'a': fmt})
    ↓
writer = HTML() [create writer]
    ↓
writer.data.formats = {'a': fmt} [ASSIGN FORMATS - line 1834]
    ↓
return writer
    ↓
writer.write(table) [call write]
    ↓
HTML.write(table)
    ↓
self.data._set_col_formats() [line 370 - APPLY FORMATS]
    ↓
for col in cols:
    if col.name in self.formats:
        col.info.format = self.formats[col.name]  [line 977]
    ↓
col.info.iter_str_vals() [uses col.info.format]
    ↓
HTML Output with formatted values
```

---

## Conclusion

The HTML writer's format parameter handling is implemented correctly with:

1. **Parameter Definition** in extra_writer_pars (core.py:1789)
2. **Assignment** in _get_writer() (core.py:1834)
3. **Application** in HTML.write() → _set_col_formats() (html.py:370 → core.py:977)
4. **Usage** in col.info.iter_str_vals() during output generation

The mechanism is simple, clean, and works as designed.
