from pydantic import BaseModel, EmailStr, Field, model_validator


class SendEmailRequest(BaseModel):
    to: list[EmailStr] = Field(min_length=1, max_length=50)
    subject: str = Field(min_length=1, max_length=998)
    html: str | None = None
    text: str | None = None
    from_email: str | None = None
    reply_to: list[EmailStr] | None = None
    cc: list[EmailStr] | None = None
    bcc: list[EmailStr] | None = None

    @model_validator(mode="after")
    def require_body(self) -> "SendEmailRequest":
        if not self.html and not self.text:
            raise ValueError("Either html or text body is required")
        return self


class SendEmailResponse(BaseModel):
    id: str
    stored_message_id: str


class EmailMessageOut(BaseModel):
    id: str
    direction: str
    resend_id: str | None
    from_address: str
    to_addresses: list[str]
    subject: str | None
    text_body: str | None
    html_body: str | None
    created_at: str


class EmailWebhookResponse(BaseModel):
    received: bool
    event_type: str | None = None
    email_id: str | None = None
