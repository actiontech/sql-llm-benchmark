# config/knowledge_base.py
import json
import os


def judge_model_knowledge_base(prompt: str, case: dict) -> str:
    """
    # The dialect conversion dataset defines key SQL information (key_info). 
    # If key_info exists in the case, the judge model's prompt should be supplemented with knowledge base content based on key_info to improve the accuracy of the judge model.
    """
    # Check if case has key_info
    key_info = case.get("key_info")
    target_dialect = case.get("target_dialect", "")
    
    if not key_info:
        return prompt
    
    # Get sys_func keywords from key_info
    sys_func_keywords = key_info.get("sys_func", [])
    if not sys_func_keywords:
        return prompt
    
    # Determine knowledge base folder based on target_dialect
    knowledge_folder = None
    if "OceanBase的Oracle模式" in target_dialect:
        knowledge_folder = "ob_oracle"
    elif target_dialect == "Postgresql-9.2":
        knowledge_folder = "pg"
    elif target_dialect == "GaussDB-v2.0_3.x":
        knowledge_folder = "gaussdb"
    
    if not knowledge_folder:
        return prompt
    
    try:
        # Load knowledge base from sys_func.json
        knowledge_file_path = os.path.join(os.path.dirname(__file__), "..", "knowledge", "document", knowledge_folder, "sys_func.json")
        
        if not os.path.exists(knowledge_file_path):
            return prompt
            
        with open(knowledge_file_path, 'r', encoding='utf-8') as f:
            knowledge_base = json.load(f)
        
        # Find matching knowledge content
        matched_content = []
        for item in knowledge_base:
            item_keywords = item.get("key_word", [])
            if isinstance(item_keywords, list):
                for keyword in sys_func_keywords:
                    for item_keyword in item_keywords:
                        if item_keyword.upper() == keyword.upper():
                            title = item.get("title", "")
                            content = item.get("content", "")
                            if content:
                                matched_content.append(f"**{title}**:\n{content}")
                            break
                    else:
                        continue
                    break
            else:
                for keyword in sys_func_keywords:
                    if item_keywords.upper() == keyword.upper():
                        title = item.get("title", "")
                        content = item.get("content", "")
                        if content:
                            matched_content.append(f"**{title}**:\n{content}")
                        break
        
        # If we found matching content, enhance the prompt
        if matched_content:
            knowledge_section = "\n\n".join(matched_content)
            enhanced_prompt = f"""{prompt}

请参考以下 {target_dialect} 语法和函数提示，回答以上问题：

{knowledge_section}"""
            return enhanced_prompt
        
    except Exception as e:
        # If there's any error loading knowledge base, return original prompt
        return prompt
    
    return prompt 