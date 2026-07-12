from app.services.resend_email import html_to_plain_text


def test_html_to_plain_text_keeps_links_and_breaks() -> None:
    html = "<p>Hello</p><p><a href='https://example.com/reset'>Reset</a></p><br/>Bye"
    text = html_to_plain_text(html)
    assert "Hello" in text
    assert "https://example.com/reset" in text
    assert "Bye" in text
