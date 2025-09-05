"""
MCP Configuration Module - Manages MCP feature enable/disable and search configuration
"""
from typing import Dict, List, Optional


# MCP Feature Configuration
MCP_CONFIG = {
    # Which evaluation dimensions enable MCP (empty means all disabled)
    "enabled_dimensions": [
        # "dialect_conversion",  # Enable MCP network search for dialect conversion judge
        # "sql_optimization",  # SQL optimization (not supported yet)
        # "sql_understanding", # SQL understanding (not supported yet)
    ],
    
    # Search configuration
    "search": {
        "max_results": 3,           # Number of search results
        "search_timeout": 30000,    # Search timeout (milliseconds)
        "engine": "playwright",     # Search engine type: playwright or serpapi
    },
    
    # SerpAPI configuration
    "serpapi": {
        "api_key": "",              # SerpAPI API Key, get from https://serpapi.com/
        "base_url": "https://serpapi.com/search.json",
        "engine": "google",
        "language": "en",
        "country": "us",
    },
    
    # Database to search site mapping (with version info)
    "site_mapping": {
        "OceanBase的Oracle模式-4.2.5": {
            "site": "oceanbase.com",
            "version": "V4.2.5"
        },
        "Postgresql-9.2": {
            "site": "postgresql.org",
            "version": "9.2"
        },
        "GaussDB-v2.0_3.x": {
            "site": "huaweicloud.com",
            "version": "GaussDB-v2.0_3.x"
        },
        "MySQL": {
            "site": "mysql.com",
            "version": None  # No specific version
        },
        "Oracle": {
            "site": "oracle.com",
            "version": None  # No specific version
        },
        "SQLServer": {
            "site": "microsoft.com",
            "version": None  # No specific version
        },
    },
}


def is_dimension_enabled(dimension: str) -> bool:
    """Check if specified evaluation dimension has MCP enabled"""
    enabled_dimensions = MCP_CONFIG.get("enabled_dimensions", [])
    return dimension in enabled_dimensions


def get_search_config() -> Dict:
    """Get search configuration"""
    return MCP_CONFIG.get("search", {})


def get_max_results() -> int:
    """Get number of search results"""
    return MCP_CONFIG.get("search", {}).get("max_results", 3)


def get_search_timeout() -> int:
    """Get search timeout (milliseconds)"""
    return MCP_CONFIG.get("search", {}).get("search_timeout", 30000)


def get_search_engine() -> str:
    """Get configured search engine type"""
    return MCP_CONFIG.get("search", {}).get("engine", "playwright")


def get_serpapi_config() -> Dict:
    """Get SerpAPI configuration"""
    return MCP_CONFIG.get("serpapi", {})


def get_serpapi_api_key() -> Optional[str]:
    """Get SerpAPI API Key"""
    return MCP_CONFIG.get("serpapi", {}).get("api_key", "")


def get_site_mapping() -> Dict[str, Dict]:
    """Get database to site mapping"""
    return MCP_CONFIG.get("site_mapping", {})


def get_search_site_for_db(target_db: str) -> Optional[Dict]:
    """Get corresponding search site info based on target database"""
    site_mapping = get_site_mapping()
    
    for db_pattern, site_info in site_mapping.items():
        if db_pattern in target_db:
            return site_info
    
    return None



# Configuration validation functions
def validate_mcp_config() -> List[str]:
    """Validate MCP configuration validity"""
    errors = []
    
    # Check required configuration items
    if not isinstance(MCP_CONFIG.get("enabled_dimensions"), list):
        errors.append("enabled_dimensions in MCP config must be a list")
    
    # Check search configuration
    search_config = MCP_CONFIG.get("search", {})
    if not isinstance(search_config.get("max_results"), int):
        errors.append("max_results in search config must be an integer")
    
    if not isinstance(search_config.get("search_timeout"), int):
        errors.append("search_timeout in search config must be an integer")
    
    return errors


# Configuration update functions
def update_mcp_config(updates: Dict) -> bool:
    """
    Update MCP configuration
    
    Args:
        updates: Configuration items to update
        
    Returns:
        Whether update was successful
    """
    try:
        for key, value in updates.items():
            if key in MCP_CONFIG:
                MCP_CONFIG[key] = value
            else:
                # Support nested updates
                if isinstance(MCP_CONFIG.get(key), dict) and isinstance(value, dict):
                    MCP_CONFIG[key].update(value)
                else:
                    MCP_CONFIG[key] = value
        
        # Validate configuration
        errors = validate_mcp_config()
        if errors:
            print(f"MCP configuration validation failed: {errors}")
            return False
        
        return True
        
    except Exception as e:
        print(f"Failed to update MCP configuration: {e}")
        return False


# Validate configuration on initialization
if __name__ == "__main__":
    errors = validate_mcp_config()
    if errors:
        print(f"MCP configuration validation failed: {errors}")
    else:
        print("MCP configuration validation passed") 