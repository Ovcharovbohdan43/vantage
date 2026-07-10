"""Normalize project categories into Research Library taxonomy."""

LIBRARY_CATEGORIES: list[str] = [
    "CRM",
    "Marketing",
    "Finance",
    "AI",
    "Productivity",
    "HR",
    "Analytics",
    "Developer Tools",
    "Cybersecurity",
    "Healthcare",
    "Education",
    "Design",
    "Other",
]

_CATEGORY_ALIASES: dict[str, str] = {
    "crm": "CRM",
    "sales": "CRM",
    "marketing": "Marketing",
    "fintech": "Finance",
    "finance": "Finance",
    "ai": "AI",
    "artificial intelligence": "AI",
    "productivity": "Productivity",
    "hr": "HR",
    "hr tech": "HR",
    "human resources": "HR",
    "analytics": "Analytics",
    "developer tools": "Developer Tools",
    "dev tools": "Developer Tools",
    "developer": "Developer Tools",
    "cybersecurity": "Cybersecurity",
    "security": "Cybersecurity",
    "health tech": "Healthcare",
    "healthcare": "Healthcare",
    "edtech": "Education",
    "education": "Education",
    "design": "Design",
    "legal tech": "Other",
    "e-commerce": "Marketing",
    "agency tools": "Marketing",
    "no-code / low-code": "Developer Tools",
}


def normalize_library_category(project_category: str) -> str:
    key = project_category.strip().lower()
    if project_category in LIBRARY_CATEGORIES:
        return project_category
    return _CATEGORY_ALIASES.get(key, "Other")
