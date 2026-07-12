from pydantic import BaseModel, Field


class SupportRequestCreate(BaseModel):
    message: str = Field(min_length=10, max_length=5000)
    subject: str = Field(default="", max_length=200)


class SupportRequestOut(BaseModel):
    ok: bool = True
