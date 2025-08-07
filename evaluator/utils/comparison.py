# utils/comparison.py
from decimal import Decimal, InvalidOperation
from collections.abc import Mapping, Sequence
from numbers import Number


def is_numeric(val) -> bool:
    """
    Checks if a value is numeric or a string that can be parsed as a number.
    """
    # First, check for numeric types
    if isinstance(val, Number):
        return True
    # Then, check if string can be parsed as Decimal
    if isinstance(val, str):
        try:
            Decimal(val)
            return True
        except InvalidOperation:
            return False
    return False


def normalize_numeric(val):
    """
    Converts numbers or numeric strings to Decimal for numerical comparison.
    Returns non-numeric values as is.
    """
    if isinstance(val, Number):
        # Convert built-in float/int to string then Decimal to reduce floating-point errors
        return Decimal(str(val))
    if isinstance(val, str):
        try:
            return Decimal(val)
        except InvalidOperation:
            pass
    return val


def deep_equal(a, b) -> bool:
    """
    Recursively compares a and b:
      - If both are Mappings (e.g., dict), compares their key sets, then recursively compares values for each key.
      - If both are Sequences of the same type (e.g., list/tuple), compares them element by element if lengths are equal.
      - Otherwise, passes both to normalize_numeric(). If both results are Decimal, compares them numerically; otherwise, performs a regular equality comparison.
    """
    # Native comparison
    if a is b or a == b:
        return True
    # 1. Both are dict-like
    if isinstance(a, Mapping) and isinstance(b, Mapping):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equal(a[k], b[k]) for k in a)

    # 2. Both are list/tuple, but exclude str (which is also a Sequence)
    if (isinstance(a, Sequence) and not isinstance(a, (str, bytes)) and
            isinstance(b, Sequence) and not isinstance(b, (str, bytes))):
        if len(a) != len(b):
            return False
        return all(deep_equal(x, y) for x, y in zip(a, b))

    # 3. Scalar or other types
    na = normalize_numeric(a)
    nb = normalize_numeric(b)
    # If both become Decimal, compare numerically
    if isinstance(na, Decimal) and isinstance(nb, Decimal):
        return na == nb

    return False 