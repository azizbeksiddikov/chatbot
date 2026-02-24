"""
Utility functions for serialization, file operations, and JSON handling.

This module provides helper functions for:
- Serializing Gemini API objects to JSON-compatible dictionaries
- File operations (timestamps, JSON saving)
- Encoding data for Server-Sent Events (SSE) streaming
"""

import json
from datetime import datetime


def serialize_contents(contents):
    """
    Serialize Gemini Content objects to JSON-compatible dictionaries.

    Args:
        contents: List of Content objects from Gemini API

    Returns:
        List of dictionaries with role and parts information
    """
    serialized = []
    for content in contents:
        content_dict = {"role": content.role}
        if hasattr(content, "parts") and content.parts:
            parts = []
            for part in content.parts:
                part_dict = {}
                if hasattr(part, "text") and part.text:
                    part_dict["text"] = part.text
                parts.append(part_dict)
            content_dict["parts"] = parts
        serialized.append(content_dict)
    return serialized


def serialize_config(config):
    """
    Serialize GenerateContentConfig to JSON-compatible dictionary.

    Args:
        config: GenerateContentConfig object (can be None)

    Returns:
        Dictionary with config data, or None if config is None
    """
    if not config:
        return None
    config_dict = {}
    if hasattr(config, "tools") and config.tools:
        tools = []
        for tool in config.tools:
            tool_dict = {}
            if hasattr(tool, "file_search") and tool.file_search:
                if hasattr(tool.file_search, "file_search_store_names"):
                    tool_dict["file_search"] = {
                        "file_search_store_names": tool.file_search.file_search_store_names
                    }
            tools.append(tool_dict)
        config_dict["tools"] = tools
    return config_dict


def generate_timestamp():
    """
    Generate a timestamp string for file naming.

    Format: YYYYMMDD_HHMMSS (e.g., "20251222_163902")

    Returns:
        Timestamp string
    """
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def save_json_file(filepath, data):
    """
    Save data to a JSON file with proper encoding and formatting.

    Args:
        filepath: Path where to save the file
        data: Data to save (will be JSON-serialized)

    Returns:
        Filepath of the saved file
    """
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    return filepath


def encode_stream_chunk(chunk_data):
    """
    Encode chunk data for Server-Sent Events (SSE) streaming.

    SSE format: "data: {json_data}\n\n"

    Args:
        chunk_data: Dictionary to encode as JSON

    Returns:
        SSE-formatted string, or error message if encoding fails
    """
    try:
        json_str = json.dumps(chunk_data, ensure_ascii=False)
        return f"data: {json_str}\n\n"
    except (TypeError, ValueError) as e:
        # Return error in SSE format if encoding fails
        error_data = {"error": f"Failed to encode response chunk: {str(e)}"}
        return f"data: {json.dumps(error_data)}\n\n"
