from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[4]
_TEMPLATES_DIR = _REPO_ROOT / "infra" / "email" / "templates"


def render_supabase_template(template_name: str, **variables: str) -> tuple[str, str, str]:
    """Render an email template using Supabase-style {{ .Var }} placeholders."""
    html_path = _TEMPLATES_DIR / f"{template_name}.html"
    text_path = _TEMPLATES_DIR / f"{template_name}.txt"
    subject_path = _TEMPLATES_DIR / f"{template_name}.subject.txt"

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
