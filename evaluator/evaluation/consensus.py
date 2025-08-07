# evaluation/consensus.py
import ast
from typing import List, Any, Union, Iterable
from collections import Counter
from math import ceil


def majority_consensus(judges_results: List[Union[List[Any], str, Any]]) -> List[Any]:
    """
     Returns the result approved by the majority of judges
    """
    # One input unit per "judge", count total judges N
    n = len(judges_results)
    if n == 0:
        return []

    def parse_one(res: Union[List[Any], str, Any]) -> List[Any]:
        # If it's a string representation of a list, try literal_eval
        if isinstance(res, str) and res.startswith('[') and res.endswith(']'):
            try:
                parsed = ast.literal_eval(res)
                if isinstance(parsed, list):
                    return parsed
            except (ValueError, SyntaxError):
                pass
        # If it's already a list, return directly; otherwise, treat it as a single-element list
        return list(res) if isinstance(res, (tuple, list)) else [res]

    # Flatten all "parsed" results from judges
    flat = []
    for r in judges_results:
        flat.extend(parse_one(r))

    counts = Counter(flat)
    threshold = ceil(n / 2)

    # Filter values whose occurrences are >= threshold
    return [val for val, cnt in counts.items() if cnt >= threshold]


def majority_bool(results: Iterable[bool]) -> bool:
    lst = list(results)
    if not lst:
        raise ValueError("List cannot be empty")
    true_count = sum(1 for v in lst if v)
    false_count = len(lst) - true_count
    return true_count >= false_count 