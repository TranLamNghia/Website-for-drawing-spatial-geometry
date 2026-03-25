def simplify_error(error_msg: str) -> str:
    if "is not one of" in error_msg:
        return "Invalid enum value used."

    if "is a required property" in error_msg:
        return "Missing required field."

    if "Additional properties are not allowed" in error_msg:
        return "Unknown field detected."

    return "Invalid JSON structure."