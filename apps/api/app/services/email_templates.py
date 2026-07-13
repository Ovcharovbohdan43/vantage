from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def _templates_dir() -> Path:
    """Resolve email templates for local monorepo and Docker (/app) layouts."""
    override = os.environ.get("EMAIL_TEMPLATES_DIR", "").strip()
    if override:
        path = Path(override)
        if path.is_dir():
            return path
        raise FileNotFoundError(f"EMAIL_TEMPLATES_DIR is not a directory: {path}")

    here = Path(__file__).resolve()
    candidates: list[Path] = [
        # Bundled next to the Python package (Docker / local apps/api layout)
        here.parents[1].parent / "email-templates",  # .../app/services -> .../email-templates
    ]

    # Docker: WORKDIR /app, this file is /app/app/services/...
    if len(here.parents) > 2:
        candidates.append(here.parents[2] / "email-templates")

    for parent in here.parents:
        candidates.append(parent / "infra" / "email" / "templates")
        candidates.append(parent / "email-templates")

    for candidate in candidates:
        if candidate.is_dir():
            return candidate

    raise FileNotFoundError(
        "Email templates not found. Set EMAIL_TEMPLATES_DIR or copy "
        "infra/email/templates into the image as /app/email-templates."
    )


def render_supabase_template(template_name: str, **variables: str) -> tuple[str, str, str]:
    """Render an email template using Supabase-style {{ .Var }} placeholders."""
    templates = _templates_dir()
    html_path = templates / f"{template_name}.html"
    text_path = templates / f"{template_name}.txt"
    subject_path = templates / f"{template_name}.subject.txt"

    if not html_path.exists():
        raise FileNotFoundError(f"Email template not found: {template_name}")

    html = _apply_variables(html_path.read_text(encoding="utf-8"), variables)
    text = _apply_variables(text_path.read_text(encoding="utf-8"), variables) if text_path.exists() else ""
    subject_raw = subject_path.read_text(encoding="utf-8").strip() if subject_path.exists() else ""
    subject = _apply_variables(subject_raw, variables) if subject_raw else ""
    return subject, html, text


def _apply_variables(content: str, variables: dict[str, str]) -> str:
    rendered = content
    for key, value in variables.items():
        rendered = rendered.replace(f"{{{{ .{key} }}}}", value)
    return rendered
