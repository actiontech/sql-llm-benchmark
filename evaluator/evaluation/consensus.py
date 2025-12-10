# evaluation/consensus.py
"""
多数共识聚合函数

提供 majority_consensus 和 majority_bool 函数，用于聚合多个裁判或多次运行的结果。
"""
import ast
from typing import List, Any, Union, Iterable
from collections import Counter
from math import ceil


def majority_consensus(judges_results: List[Union[List[Any], str, Any]]) -> List[Any]:
    """
    返回被多数裁判认可的结果
    
    Args:
        judges_results: 裁判结果列表，支持两种格式：
            - 单个裁判列表：每个元素代表一个裁判的结果
            - 多个 run 的结果：每个元素代表一个 run，每个 run 包含多个裁判的结果
    
    Returns:
        被多数裁判认可的结果列表
    
    Note:
        对于多个 run 的格式，采用两级聚合：
        1. 先对每个 run 内的裁判结果进行聚合
        2. 再对所有 run 的聚合结果进行聚合
    """
    if len(judges_results) == 0:
        return []
    
    # 检测是否为多个 run 的格式（每个元素是列表，且第一个子元素是字符串列表格式）
    is_multi_run_format = False
    if judges_results and isinstance(judges_results[0], list):
        first_run = judges_results[0]
        if first_run and isinstance(first_run[0], str) and first_run[0].startswith('[') and first_run[0].endswith(']'):
            all_match_format = all(
                isinstance(item, list) and item and isinstance(item[0], str) and item[0].startswith('[') and item[0].endswith(']')
                for item in judges_results
            )
            if all_match_format:
                is_multi_run_format = True
    
    if is_multi_run_format:
        # 两级聚合：先聚合每个 run 内的裁判结果，再聚合所有 run 的结果
        run_aggregated_results = []
        for run_result in judges_results:
            run_consensus = _consensus_single_run(run_result)
            if run_consensus:
                run_aggregated_results.append(run_consensus)
        
        if not run_aggregated_results:
            return []
        
        # 展平所有 run 的聚合结果
        all_run_results = []
        for run_result in run_aggregated_results:
            if isinstance(run_result, list):
                all_run_results.extend(run_result)
            else:
                all_run_results.append(run_result)
        
        # 基于 run 数量计算阈值并聚合
        n_runs = len(run_aggregated_results)
        if n_runs == 0:
            return []
        
        normalized_results = [str(val) for val in all_run_results]
        counts = Counter(normalized_results)
        threshold = ceil(n_runs / 2)
        
        return [val for val, cnt in counts.items() if cnt >= threshold]
    
    return _consensus_single_run(judges_results)


def _consensus_single_run(judges_results: List[Union[List[Any], str, Any]]) -> List[Any]:
    """
    对单个裁判列表进行聚合
    
    Args:
        judges_results: 裁判结果列表，每个元素代表一个裁判的结果
            支持格式：字符串列表、普通列表、字符串列表的列表
    
    Returns:
        被多数裁判认可的结果列表
    """
    if len(judges_results) == 0:
        return []
    
    def parse_judge_result(res: Union[List[Any], str, Any]) -> List[Any]:
        """解析单个裁判的结果为列表格式"""
        if isinstance(res, str) and res.startswith('[') and res.endswith(']'):
            try:
                parsed = ast.literal_eval(res)
                if isinstance(parsed, list):
                    return parsed
            except (ValueError, SyntaxError):
                pass
        
        if isinstance(res, (tuple, list)):
            # 处理字符串列表的列表格式（2维数组）
            if res and isinstance(res[0], str) and res[0].startswith('[') and res[0].endswith(']'):
                flat_result = []
                for item in res:
                    if isinstance(item, str) and item.startswith('[') and item.endswith(']'):
                        try:
                            parsed = ast.literal_eval(item)
                            if isinstance(parsed, list):
                                flat_result.extend(parsed)
                        except (ValueError, SyntaxError):
                            pass
                    elif isinstance(item, (tuple, list)):
                        flat_result.extend(item)
                    else:
                        flat_result.append(item)
                return flat_result
            else:
                return list(res)
        
        return [res]
    
    # 解析并展平所有裁判结果
    flat = []
    for judge_result in judges_results:
        flat.extend(parse_judge_result(judge_result))
    
    # 统一类型为字符串以便一致比较（处理数字和字符串混合的情况）
    normalized_flat = [str(val) for val in flat]
    
    # 统计并基于多数原则过滤
    counts = Counter(normalized_flat)
    n = len(judges_results)
    threshold = ceil(n / 2)
    
    return [val for val, cnt in counts.items() if cnt >= threshold]


def majority_bool(results: Iterable[bool]) -> bool:
    """
    返回布尔值列表的多数结果
    
    Args:
        results: 布尔值可迭代对象
    
    Returns:
        多数结果（True 或 False），平局时返回 True
    
    Raises:
        ValueError: 当输入为空时
    """
    lst = list(results)
    if not lst:
        raise ValueError("List cannot be empty")
    true_count = sum(1 for v in lst if v)
    false_count = len(lst) - true_count
    return true_count >= false_count 