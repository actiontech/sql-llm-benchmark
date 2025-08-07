# utils/sql_converter.py
import re


class SqlConverter:
    """
    一个用于将独立的SQL语句转换为存储过程，以及从存储过程中提取SQL语句的工具类。
    
    支持的数据库类型：
    - Oracle: EXECUTE IMMEDIATE 模式的存储过程
    - SQL Server: TRY-CATCH 模式的存储过程  
    - PostgreSQL: $$ 分隔符的函数，支持 EXECUTE 和 RETURN QUERY 模式
    - GaussDB: 类似PostgreSQL的函数，支持复杂查询和异常处理
    """

    def __init__(self):
        """初始化，定义用于检测已有存储过程和函数的正则表达式。"""
        # Oracle: 支持 DELIMITER $$ CREATE OR REPLACE PROCEDURE、CREATE OR REPLACE PROCEDURE、CREATE PROCEDURE 等多种开头
        self._oracle_proc_pattern = re.compile(
            r'^\s*(DELIMITER\s+\$\$\s*)?(CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE)\b',
            re.IGNORECASE
        )
        # SQL Server: 支持 CREATE PROC/PROCEDURE, ALTER PROC/PROCEDURE, CREATE OR ALTER PROCEDURE
        # 同时过滤掉 CREATE TABLE PARTITION
        self._sqlserver_proc_pattern = re.compile(
            r'^\s*(?:CREATE|ALTER)(?:\s+OR\s+ALTER)?\s+PROC(?:EDURE)?\b(?!.*\bTABLE\b.*\bPARTITION\b)',
            re.IGNORECASE
        )
        
        # Oracle: 支持 DELIMITER $$ CREATE OR REPLACE FUNCTION、CREATE OR REPLACE FUNCTION、CREATE FUNCTION 等多种开头
        self._oracle_func_pattern = re.compile(
            r'^\s*(DELIMITER\s+\$\$\s*)?(CREATE\s+(OR\s+REPLACE\s+)?FUNCTION)\b',
            re.IGNORECASE
        )
        # SQL Server: 支持 CREATE FUNCTION, ALTER FUNCTION, CREATE OR ALTER FUNCTION
        self._sqlserver_func_pattern = re.compile(
            r'^\s*(?:CREATE|ALTER)(?:\s+OR\s+ALTER)?\s+FUNCTION\b',
            re.IGNORECASE
        )
        
        # PostgreSQL: 支持 CREATE OR REPLACE FUNCTION, CREATE FUNCTION
        self._postgresql_func_pattern = re.compile(
            r'^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b.*\$\w*\$.*\$\w*\$\s*(?:LANGUAGE\s+plpgsql)?',
            re.IGNORECASE | re.DOTALL
        )
        
        # GaussDB: 支持 CREATE OR REPLACE FUNCTION, CREATE FUNCTION (类似PostgreSQL但可能有细微差异)
        self._gaussdb_func_pattern = re.compile(
            r'^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b.*\$\w*\$.*\$\w*\$',
            re.IGNORECASE | re.DOTALL
        )

    def _is_already_procedure(self, sql_text: str, db_type: str) -> bool:
        """检查SQL文本是否已经是创建存储过程的语句。"""
        if db_type == 'ORACLE':
            return bool(self._oracle_proc_pattern.match(sql_text))
        elif db_type == 'SQLSERVER':
            return bool(self._sqlserver_proc_pattern.match(sql_text))
        elif db_type == 'OCEANBASE的ORACLE模式-4.2.5':
            return bool(self._oracle_proc_pattern.match(sql_text))
        return False

    def _is_already_function(self, sql_text: str, db_type: str) -> bool:
        """检查SQL文本是否已经是创建函数的语句。"""
        if db_type == 'ORACLE':
            return bool(self._oracle_func_pattern.match(sql_text))
        elif db_type == 'SQLSERVER':
            return bool(self._sqlserver_func_pattern.match(sql_text))
        elif db_type == 'POSTGRESQL-9.2':
            return bool(self._postgresql_func_pattern.match(sql_text))
        elif db_type == 'GAUSSDB-V2.0_3.X':
            return bool(self._gaussdb_func_pattern.match(sql_text))
        return False

    def _is_already_procedure_or_function(self, sql_text: str, db_type: str) -> bool:
        """检查SQL文本是否已经是创建存储过程或函数的语句。"""
        return (self._is_already_procedure(sql_text, db_type) or 
                self._is_already_function(sql_text, db_type))

    def _generate_proc_name(self, case_id) -> str:
        """生成一个case id的过程名。"""
        return f"p_universal_case_{case_id}"

    def convert_to_procedure(self, case_id: str, db_type: str, sql_text: str) -> str:
        """
        将SQL文本以通用方式转换为存储过程的主方法。
        
        :param db_type: 数据库类型, 'ORACLE' or 'SQLSERVER'.
        :param sql_text: 完整的SQL语句文本。
        :return: 转换后的存储过程创建脚本。
        """
        db_type_upper = db_type.upper()
        if db_type_upper not in ['ORACLE', 'SQLSERVER']:
            raise ValueError("数据库类型错误，目前仅支持 'ORACLE' 或 'SQLSERVER'。")

        if not sql_text or not sql_text.strip():
            raise ValueError("SQL文本不能为空。")
            
        sql_text = sql_text.strip()

        if self._is_already_procedure_or_function(sql_text, db_type_upper):
            return sql_text

        proc_name = self._generate_proc_name(case_id)
        
        # 移除SQL语句末尾的分号（如果存在）
        if sql_text.endswith(';'):
            sql_text = sql_text[:-1]

        # 为确保所有代码路径都有返回值以满足静态分析器，我们先声明一个变量
        converted_procedure: str = ""

        if db_type_upper == 'ORACLE':
            # Oracle的通用方法是 EXECUTE IMMEDIATE
            escaped_sql = sql_text.replace("'", "''")
            converted_procedure = (
                f"CREATE OR REPLACE PROCEDURE {proc_name} AS\n"
                f"BEGIN\n"
                f"    EXECUTE IMMEDIATE '{escaped_sql}';\n"
                f"END {proc_name};"
            )
        elif db_type_upper == 'SQLSERVER':
            # SQL Server的通用方法是 BEGIN TRY ... END CATCH
            converted_procedure = (
                f"CREATE OR ALTER PROCEDURE {proc_name}\n"
                f"AS\n"
                f"BEGIN\n"
                f"    SET NOCOUNT ON;\n"
                f"    BEGIN TRY\n"
                f"        {sql_text};\n"
                f"    END TRY\n"
                f"    BEGIN CATCH\n"
                f"        THROW;\n"
                f"    END CATCH;\n"
                f"END;"
            )
        
        return converted_procedure

    def extract_sql_from_procedure(self, db_type: str, procedure_text: str) -> str:
        """
        从存储过程中提取原始SQL语句。
        
        :param db_type: 数据库类型, 'OCEANBASE的ORACLE模式-4.2.5'、'SQLSERVER'、'POSTGRESQL' 或 'GAUSSDB'.
        :param procedure_text: 存储过程的完整文本。
        :return: 提取出的原始SQL语句，如果不是存储过程则返回原文本。
        """
        db_type_upper = db_type.upper()
        if db_type_upper not in ["OCEANBASE的ORACLE模式-4.2.5", 'SQLSERVER', 'POSTGRESQL-9.2', 'GAUSSDB-V2.0_3.X']:
            raise ValueError("数据库类型错误，目前支持 'OCEANBASE的ORACLE模式-4.2.5'、'SQLSERVER'、'POSTGRESQL' 或 'GAUSSDB'。")

        if not procedure_text or not procedure_text.strip():
            raise ValueError("存储过程文本不能为空。")
            
        procedure_text = procedure_text.strip()

        # 如果不是存储过程或函数，直接返回原文本
        if not self._is_already_procedure_or_function(procedure_text, db_type_upper):
            return procedure_text

        if db_type_upper == 'OCEANBASE的ORACLE模式-4.2.5':
            return self._extract_sql_from_oracle_procedure(procedure_text)
        elif db_type_upper == 'SQLSERVER':
            return self._extract_sql_from_sqlserver_procedure(procedure_text)
        elif db_type_upper == 'POSTGRESQL-9.2':
            return self._extract_sql_from_postgresql_procedure(procedure_text)
        elif db_type_upper == 'GAUSSDB-V2.0_3.X':
            return self._extract_sql_from_gaussdb_procedure(procedure_text)
        
        return procedure_text

    def _extract_sql_from_oracle_procedure(self, procedure_text: str) -> str:
        """从Oracle存储过程中提取SQL语句。"""
        # 查找 EXECUTE IMMEDIATE 语句
        execute_immediate_pattern = re.compile(
            r"EXECUTE\s+IMMEDIATE\s+'([^']*(?:''[^']*)*)'",
            re.IGNORECASE | re.DOTALL
        )
        
        match = execute_immediate_pattern.search(procedure_text)
        if match:
            # 提取SQL并还原转义的单引号
            sql_content = match.group(1)
            # 将 '' 还原为 '
            restored_sql = sql_content.replace("''", "'")
            return restored_sql.strip()
        
        # 如果没有找到EXECUTE IMMEDIATE，尝试提取BEGIN...END之间的内容
        begin_end_pattern = re.compile(
            r"BEGIN\s+(.*?)\s+END\s+[^;]*;?",
            re.IGNORECASE | re.DOTALL
        )
        
        match = begin_end_pattern.search(procedure_text)
        if match:
            content = match.group(1).strip()
            # 移除可能的EXECUTE IMMEDIATE包装
            if content.upper().startswith('EXECUTE IMMEDIATE'):
                return self._extract_sql_from_oracle_procedure(content)
            return content
        
        return procedure_text

    def _extract_sql_from_sqlserver_procedure(self, procedure_text: str) -> str:
        """从SQL Server存储过程中提取SQL语句。"""
        # 查找 BEGIN TRY ... END TRY 之间的内容
        try_block_pattern = re.compile(
            r"BEGIN\s+TRY\s+(.*?)\s+END\s+TRY",
            re.IGNORECASE | re.DOTALL
        )
        
        match = try_block_pattern.search(procedure_text)
        if match:
            sql_content = match.group(1).strip()
            # 移除末尾的分号
            if sql_content.endswith(';'):
                sql_content = sql_content[:-1]
            return sql_content.strip()
        
        # 如果没有找到TRY块，尝试提取AS后面BEGIN...END之间的内容
        as_begin_pattern = re.compile(
            r"AS\s+BEGIN\s+(.*?)\s+END;?",
            re.IGNORECASE | re.DOTALL
        )
        
        match = as_begin_pattern.search(procedure_text)
        if match:
            content = match.group(1).strip()
            # 移除SET NOCOUNT ON等SQL Server特定语句
            lines = content.split('\n')
            filtered_lines = []
            skip_patterns = [
                re.compile(r'^\s*SET\s+NOCOUNT\s+ON\s*;?\s*$', re.IGNORECASE),
                re.compile(r'^\s*BEGIN\s+TRY\s*$', re.IGNORECASE),
                re.compile(r'^\s*END\s+TRY\s*$', re.IGNORECASE),
                re.compile(r'^\s*BEGIN\s+CATCH\s*$', re.IGNORECASE),
                re.compile(r'^\s*END\s+CATCH\s*$', re.IGNORECASE),
                re.compile(r'^\s*THROW\s*;?\s*$', re.IGNORECASE)
            ]
            
            for line in lines:
                if not any(pattern.match(line) for pattern in skip_patterns):
                    filtered_lines.append(line)
            
            result = '\n'.join(filtered_lines).strip()
            # 如果还有TRY块，递归处理
            if 'BEGIN TRY' in result.upper():
                return self._extract_sql_from_sqlserver_procedure(result)
            
            # 移除末尾的分号
            if result.endswith(';'):
                result = result[:-1]
            return result.strip()
        
        return procedure_text

    def _extract_sql_from_postgresql_procedure(self, procedure_text: str) -> str:
        """从PostgreSQL函数中提取SQL语句。"""
        # 首先提取$ ... $之间的内容，支持不同的分隔符
        # 使用贪婪匹配确保匹配到最后的分隔符
        dollar_pattern = re.compile(
            r'\$(\w*)\$(.*)\$\1\$',
            re.IGNORECASE | re.DOTALL
        )
        
        match = dollar_pattern.search(procedure_text)
        if not match:
            return procedure_text
            
        function_body = match.group(2).strip()
        
        # 1. 处理EXECUTE 'sql'格式 - 最常见
        single_quote_pattern = re.compile(
            r"EXECUTE\s+'([^']*(?:''[^']*)*)'",
            re.IGNORECASE | re.DOTALL
        )
        single_quote_match = single_quote_pattern.search(function_body)
        if single_quote_match:
            sql_content = single_quote_match.group(1)
            return sql_content.replace("''", "'").strip()
        
        # 2. 处理EXECUTE $tag$ ... $tag$格式
        tagged_pattern = re.compile(
            r"EXECUTE\s+\$([a-zA-Z_]\w*)\$(.*?)\$\1\$",
            re.IGNORECASE | re.DOTALL
        )
        tagged_match = tagged_pattern.search(function_body)
        if tagged_match:
            return tagged_match.group(2).strip()
        
        # 3. 处理EXECUTE $$ ... $$格式 - 重新设计
        # 直接在function_body中查找"EXECUTE $$"到下一个"$$"的内容
        execute_start = "EXECUTE $$"
        execute_pos = function_body.find(execute_start)
        if execute_pos != -1:
            # 找到EXECUTE $$的结束位置
            content_start = execute_pos + len(execute_start)
            # 从内容开始位置查找结束的$$
            content_part = function_body[content_start:]
            end_pos = content_part.find('$$')
            if end_pos != -1:
                sql_content = content_part[:end_pos].strip()
                if sql_content:
                    return sql_content
        
        # 4. 处理RETURN QUERY语句 - 改进版本，处理复杂SQL
        return_query_pattern = re.compile(
            r"RETURN\s+QUERY\s+(.*?)(?=\s*(?:;?\s*EXCEPTION|;?\s*END\s|$))",
            re.IGNORECASE | re.DOTALL
        )
        return_match = return_query_pattern.search(function_body)
        if return_match:
            sql_content = return_match.group(1).strip()
            # 移除末尾的分号
            if sql_content.endswith(';'):
                sql_content = sql_content[:-1]
            return sql_content.strip()
        
        # 5. 处理特殊的FOR循环中的SELECT语句
        for_select_pattern = re.compile(
            r"FOR\s+\w+\s+IN\s+(SELECT\s+.*?)\s+LOOP",
            re.IGNORECASE | re.DOTALL
        )
        for_match = for_select_pattern.search(function_body)
        if for_match:
            return for_match.group(1).strip()
        
        # 6. 处理嵌套BEGIN...END结构中的SQL语句
        nested_begin_pattern = re.compile(
            r"BEGIN\s+(.*?)\s+(?:EXCEPTION|END)",
            re.IGNORECASE | re.DOTALL
        )
        
        # 找到所有BEGIN块，优先处理最内层的
        nested_matches = list(nested_begin_pattern.finditer(function_body))
        if nested_matches:
            # 按照匹配长度排序，优先处理较短的（通常是内层的）
            nested_matches.sort(key=lambda x: len(x.group(1)))
            
            for nested_match in nested_matches:
                content = nested_match.group(1).strip()
                
                # 清理注释
                content = self._clean_sql_comments(content)
                
                # 检查是否包含完整的SQL语句
                content_upper = content.upper()
                
                # 如果包含主要SQL关键字且不包含复杂的PL/pgSQL关键字，可能是目标SQL
                has_sql_keywords = any(keyword in content_upper for keyword in ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'])
                has_plpgsql_keywords = any(keyword in content_upper for keyword in ['EXECUTE', 'RETURN', 'FOR', 'LOOP', 'IF', 'WHILE', 'DECLARE', 'CURSOR'])
                
                if has_sql_keywords and not has_plpgsql_keywords:
                    # 尝试提取完整的SQL语句
                    main_sql = self._extract_main_sql_from_plpgsql(content)
                    if main_sql and len(main_sql) > 20:  # 确保提取的SQL有一定长度
                        return main_sql
                    
                    # 如果没有找到，直接返回清理后的内容
                    if content.endswith(';'):
                        content = content[:-1]
                    return content.strip()
        
        # 7. 最后处理简单的SQL语句
        begin_pattern = re.compile(
            r"BEGIN\s+(.*?)\s+(?:EXCEPTION|END)",
            re.IGNORECASE | re.DOTALL
        )
        begin_match = begin_pattern.search(function_body)
        if begin_match:
            content = begin_match.group(1).strip()
            
            # 如果内容不包含复杂的PL/pgSQL关键字，可能是直接的SQL
            content_upper = content.upper()
            if not any(keyword in content_upper for keyword in ['EXECUTE', 'RETURN', 'BEGIN', 'FOR', 'LOOP', 'IF', 'WHILE', 'DECLARE']):
                if content.endswith(';'):
                    content = content[:-1]
                return content.strip()
            
            # 尝试提取最主要的SQL语句
            main_sql = self._extract_main_sql_from_plpgsql(content)
            if main_sql and main_sql != content:
                return main_sql
        
        # 如果都没有匹配到，返回原文本
        return procedure_text

    def _extract_sql_from_gaussdb_procedure(self, procedure_text: str) -> str:
        """从GaussDB函数中提取SQL语句。"""
        # GaussDB使用类似PostgreSQL的语法，但需要特殊处理
        
        # 首先尝试PostgreSQL的提取方法
        result = self._extract_sql_from_postgresql_procedure(procedure_text)
        
        # 如果PostgreSQL方法成功提取且结果合理，直接返回
        # 检查结果是否真的是提取的SQL而不是原存储过程
        if (result != procedure_text and 
            len(result.strip()) > 0 and
            not result.startswith('CREATE OR REPLACE FUNCTION') and
            not result.startswith('$$') and 
            not result.startswith('$func$') and
            not result.endswith('$$ LANGUAGE plpgsql;') and
            not result.endswith('$func$;')):
            return result
        
        # 如果PostgreSQL方法失败或结果不理想，尝试GaussDB特定的处理
        # 提取$ ... $之间的内容，支持不同的分隔符
        dollar_pattern = re.compile(
            r'\$(\w*)\$(.*)\$\1\$',
            re.IGNORECASE | re.DOTALL
        )
        
        match = dollar_pattern.search(procedure_text)
        if not match:
            return procedure_text
            
        function_body = match.group(2).strip()
        
        # 1. 处理EXECUTE语句 - 各种格式
        execute_patterns = [
            # EXECUTE 'sql'
            re.compile(r"EXECUTE\s+'([^']*(?:''[^']*)*)'", re.IGNORECASE | re.DOTALL),
            # EXECUTE $tag$...$tag$
            re.compile(r"EXECUTE\s+\$([a-zA-Z_]\w*)\$(.*?)\$\1\$", re.IGNORECASE | re.DOTALL),
            # EXECUTE $$...$$
            re.compile(r"EXECUTE\s+\$\$(.*?)\$\$", re.IGNORECASE | re.DOTALL)
        ]
        
        for pattern in execute_patterns:
            match = pattern.search(function_body)
            if match:
                if len(match.groups()) == 1:
                    # 单引号或$$格式
                    sql_content = match.group(1)
                    if pattern.pattern.find("'") != -1:  # 单引号格式
                        sql_content = sql_content.replace("''", "'")
                    return sql_content.strip()
                else:
                    # $tag$格式
                    return match.group(2).strip()
        
        # 2. 处理RETURN QUERY语句
        return_query_pattern = re.compile(
            r"RETURN\s+QUERY\s+(.*?)(?=\s*(?:EXCEPTION|END|$))",
            re.IGNORECASE | re.DOTALL
        )
        return_match = return_query_pattern.search(function_body)
        if return_match:
            sql_content = return_match.group(1).strip()
            if sql_content.endswith(';'):
                sql_content = sql_content[:-1]
            return sql_content.strip()
        
        # 3. 特殊处理FOR循环中的SELECT语句
        for_select_pattern = re.compile(
            r"FOR\s+\w+\s+IN\s+(SELECT\s+.*?)\s+LOOP",
            re.IGNORECASE | re.DOTALL
        )
        for_match = for_select_pattern.search(function_body)
        if for_match:
            return for_match.group(1).strip()
        
        # 4. 处理简单的SQL语句（BEGIN...END中的直接SQL）
        begin_pattern = re.compile(
            r"BEGIN\s+(.*?)\s+(?:EXCEPTION|END)",
            re.IGNORECASE | re.DOTALL
        )
        begin_match = begin_pattern.search(function_body)
        if begin_match:
            content = begin_match.group(1).strip()
            
            # 清理注释
            content = self._clean_sql_comments(content)
            
            # 如果内容不包含复杂的PL/pgSQL关键字，可能是直接的SQL
            content_upper = content.upper()
            plpgsql_keywords = ['EXECUTE', 'RETURN', 'BEGIN', 'FOR', 'LOOP', 'IF', 'WHILE', 'DECLARE', 'CURSOR']
            
            # 检查是否为简单的SQL语句
            if not any(keyword in content_upper for keyword in plpgsql_keywords):
                if content.endswith(';'):
                    content = content[:-1]
                return content.strip()
            
            # 尝试提取最主要的SQL语句
            main_sql = self._extract_main_sql_from_plpgsql(content)
            if main_sql and main_sql != content:
                return main_sql
        
        # 5. 如果还是没有提取到，尝试从整个function_body中直接提取SQL语句
        main_sql = self._extract_main_sql_from_plpgsql(function_body)
        if main_sql:
            return main_sql
        
        # 如果都没有匹配到合适的结果，返回原文本
        return procedure_text
    
    def _clean_sql_comments(self, sql_text: str) -> str:
        """清理SQL中的注释"""
        # 移除单行注释 -- 
        lines = sql_text.split('\n')
        cleaned_lines = []
        for line in lines:
            # 找到--注释的位置
            comment_pos = line.find('--')
            if comment_pos != -1:
                # 检查--是否在字符串中
                in_string = False
                quote_char = None
                for i, char in enumerate(line[:comment_pos]):
                    if char in ["'", '"'] and (i == 0 or line[i-1] != '\\'):
                        if not in_string:
                            in_string = True
                            quote_char = char
                        elif char == quote_char:
                            in_string = False
                            quote_char = None
                
                if not in_string:
                    line = line[:comment_pos]
            
            cleaned_lines.append(line.rstrip())
        
        # 移除空行和只有空白字符的行
        cleaned_lines = [line for line in cleaned_lines if line.strip()]
        return '\n'.join(cleaned_lines)
    
    def _extract_main_sql_from_plpgsql(self, plpgsql_code: str) -> str:
        """从PL/pgSQL代码中提取主要的SQL语句"""
        # 首先处理FOR循环中的SELECT语句
        for_select_pattern = re.compile(
            r"FOR\s+\w+\s+IN\s+(SELECT\s+.*?)(?:\s+LOOP|\s*$)",
            re.IGNORECASE | re.DOTALL
        )
        for_match = for_select_pattern.search(plpgsql_code)
        if for_match:
            return for_match.group(1).strip()
        
        # 清理注释后再处理
        cleaned_code = self._clean_sql_comments(plpgsql_code)
        
        # 改进的SQL语句识别模式，支持更复杂的查询
        sql_statement_patterns = [
            # UPDATE语句 - 优先匹配，支持复杂的WHERE子句和嵌套查询
            re.compile(r'(UPDATE\s+[^;]*?)(?=\s*(?:;|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL),
            # INSERT语句
            re.compile(r'(INSERT\s+INTO\s+.*?)(?=\s*(?:;|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL),
            # DELETE语句
            re.compile(r'(DELETE\s+FROM\s+.*?)(?=\s*(?:;|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL),
            # CREATE语句
            re.compile(r'(CREATE\s+(?:TABLE|VIEW|INDEX|TYPE)\s+.*?)(?=\s*(?:;|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL),
            # ALTER语句
            re.compile(r'(ALTER\s+(?:TABLE|VIEW|INDEX)\s+.*?)(?=\s*(?:;|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL),
            # DROP语句
            re.compile(r'(DROP\s+(?:TABLE|VIEW|INDEX|TYPE)\s+.*?)(?=\s*(?:;|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL),
            # SELECT语句 - 最后匹配，支持复杂查询
            re.compile(r'(SELECT\s+(?:(?!(?:INTO|FOR)\s+\w+).)*?)(?=\s*(?:INTO\s+\w+|;|LOOP|EXCEPTION|END\s|$))', re.IGNORECASE | re.DOTALL)
        ]
        
        for pattern in sql_statement_patterns:
            match = pattern.search(cleaned_code)
            if match:
                sql_statement = match.group(1).strip()
                if sql_statement.endswith(';'):
                    sql_statement = sql_statement[:-1]
                # 验证提取的SQL是否合理
                if len(sql_statement) > 10 and not sql_statement.upper().startswith('FOR'):
                    # 进一步验证这确实是一个完整的SQL语句
                    sql_upper = sql_statement.upper()
                    main_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP']
                    if any(sql_upper.startswith(kw) for kw in main_keywords):
                        return sql_statement.strip()
        
        return ""