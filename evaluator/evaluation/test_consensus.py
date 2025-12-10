# evaluation/test_consensus.py
"""
majority_consensus 和 majority_bool 函数的单元测试
"""
import unittest
import sys
import importlib.util
from pathlib import Path

# 直接加载 consensus 模块以避免触发 evaluation.__init__.py
consensus_path = Path(__file__).parent / "consensus.py"
spec = importlib.util.spec_from_file_location("consensus", consensus_path)
consensus_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(consensus_module)

majority_consensus = consensus_module.majority_consensus
majority_bool = consensus_module.majority_bool


class TestMajorityConsensus(unittest.TestCase):
    """majority_consensus 函数的测试用例"""
    
    def test_empty_list(self):
        """测试空列表"""
        result = majority_consensus([])
        self.assertEqual(result, [])
    
    def test_single_judge(self):
        """测试单个裁判输入"""
        result = majority_consensus([['1', '2']])
        self.assertEqual(set(result), {'1', '2'})
        
        result = majority_consensus(["['1', '2']"])
        self.assertEqual(set(result), {'1', '2'})
    
    def test_list_of_lists(self):
        """测试列表的列表格式"""
        result = majority_consensus([['1'], ['1'], ['2']])
        self.assertEqual(result, ['1'])
        
        result = majority_consensus([['1'], ['2'], ['3']])
        self.assertEqual(result, [])
        
        result = majority_consensus([['1'], ['1'], ['2'], ['2']])
        self.assertEqual(result, ['1', '2'])
    
    def test_string_list_representation(self):
        """测试字符串列表格式"""
        result = majority_consensus(["['1']", "['1']", "['2']"])
        self.assertEqual(result, ['1'])
        
        result = majority_consensus(["['1']", ['1'], "['2']"])
        self.assertEqual(result, ['1'])
    
    def test_multi_run_format(self):
        """测试多个 run 格式的两级聚合"""
        result = majority_consensus([["['1']", "['2']"], ["['1']", "['3']"]])
        self.assertEqual(set(result), {'1', '2', '3'})
        
        result = majority_consensus([
            ["['1']", "['2']"],
            ["['1']", "['2']"],
            ["['1']", "['3']"]
        ])
        self.assertEqual(set(result), {'1', '2'})
    
    def test_mixed_formats(self):
        """测试混合格式输入"""
        result = majority_consensus([
            ['1'],
            "['1']",
            ["['2']", "['3']"]
        ])
        self.assertEqual(result, ['1'])
    
    def test_complex_multi_run_format(self):
        """测试复杂的多个 run 格式（不同数量的裁判）"""
        result = majority_consensus([
            ["['1', '2']", "['3']"],
            ["['1']", "['2', '3']"],
            ["['1', '3']"]
        ])
        self.assertEqual(set(result), {'1', '2', '3'})
    
    def test_numeric_values(self):
        """测试数值类型输入（自动转换为字符串）"""
        result = majority_consensus([[1, 2], [1, 3], [1]])
        self.assertEqual(result, ['1'])
    
    def test_string_values(self):
        """测试字符串值输入"""
        result = majority_consensus([
            ['rule_1', 'rule_2'],
            ['rule_1', 'rule_3'],
            ['rule_1']
        ])
        self.assertEqual(result, ['rule_1'])
    
    def test_single_element_list(self):
        """测试单元素列表"""
        result = majority_consensus([['1'], ['2'], ['1']])
        self.assertEqual(result, ['1'])
    
    def test_all_judges_agree(self):
        """测试所有裁判一致"""
        result = majority_consensus([['1'], ['1'], ['1']])
        self.assertEqual(result, ['1'])
    
    def test_no_majority(self):
        """测试没有多数共识的情况"""
        result = majority_consensus([['1'], ['2'], ['3']])
        self.assertEqual(result, [])
        
        result = majority_consensus([['1'], ['1'], ['2'], ['2']])
        self.assertEqual(set(result), {'1', '2'})
    
    def test_tuple_input(self):
        """测试元组格式输入"""
        result = majority_consensus([('1', '2'), ('1', '3'), ('1',)])
        self.assertEqual(result, ['1'])
    
    def test_invalid_string_format(self):
        """测试非列表格式的字符串输入"""
        result = majority_consensus(['not a list', 'also not'])
        self.assertEqual(set(result), {'not a list', 'also not'})
    
    def test_mixed_numeric_and_string_types(self):
        """测试混合数字和字符串类型（自动统一为字符串）"""
        result = majority_consensus(['[1, 2, 3]', "['1', '3']", "['1', '3']"])
        self.assertEqual(set(result), {'1', '3'})
        
        result = majority_consensus([[1, 2], ['1', '2'], [1]])
        self.assertEqual(set(result), {'1', '2'})
    
    def test_empty_list_in_input(self):
        """测试输入中包含空列表的情况"""
        result = majority_consensus(["['1', '3']", '[]', "['1', '2', '3']"])
        self.assertEqual(set(result), {'1', '3'})
        self.assertNotIn('2', result)
    
    def test_user_example_simple_list(self):
        """测试简单列表格式（普通列表，非字符串列表）"""
        result = majority_consensus([["1","2"], [], ["1","3"]])
        self.assertEqual(result, ['1'])
        self.assertNotIn('2', result)
        self.assertNotIn('3', result)
    
    def test_user_example_multi_run(self):
        """测试多个 run 格式（3个 run，每个 run 有 3 个裁判）"""
        result = majority_consensus([
            ["['1', '2', '3']", "['1', '3']", "['1', '3']"],
            ["['1', '3']", "['1', '3']", "['1', '3']"],
            ["['1', '3']", "['1', '3']", "['1', '3']"]
        ])
        self.assertEqual(set(result), {'1', '3'})
        self.assertNotIn('2', result)


class TestMajorityBool(unittest.TestCase):
    """majority_bool 函数的测试用例"""
    
    def test_empty_list(self):
        """测试空列表"""
        with self.assertRaises(ValueError):
            majority_bool([])
    
    def test_all_true(self):
        """测试全部为True"""
        result = majority_bool([True, True, True])
        self.assertTrue(result)
    
    def test_all_false(self):
        """测试全部为False"""
        result = majority_bool([False, False, False])
        self.assertFalse(result)
    
    def test_majority_true(self):
        """测试多数为True"""
        result = majority_bool([True, True, False])
        self.assertTrue(result)
        
        result = majority_bool([True, False, False, True])
        self.assertTrue(result)
    
    def test_majority_false(self):
        """测试多数为False的情况"""
        result = majority_bool([False, False, True])
        self.assertFalse(result)
        
        # 平局时返回 True（true_count >= false_count）
        result = majority_bool([False, True, True, False])
        self.assertTrue(result)
    
    def test_tie(self):
        """测试平局情况（True和False数量相等）"""
        result = majority_bool([True, False])
        self.assertTrue(result)
        
        result = majority_bool([True, False, True, False])
        self.assertTrue(result)
    
    def test_single_value(self):
        """测试单个值"""
        result = majority_bool([True])
        self.assertTrue(result)
        
        result = majority_bool([False])
        self.assertFalse(result)
    
    def test_iterable_input(self):
        """测试可迭代对象输入"""
        result = majority_bool((True, False, True))
        self.assertTrue(result)
        
        result = majority_bool({True, False, True})
        self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()

