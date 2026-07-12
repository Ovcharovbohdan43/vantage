from pydantic import BaseModel, Field


ALLOWED_FEEDBACK_TAGS = (
    "report_useful",
    "waited_too_long",
    "bugs",
    "easy_to_use",
    "confusing",
    "would_recommend",
)


class FeedbackStatusOut(BaseModel):
    submitted: bool


class FeedbackCreate(BaseModel):
    project_id: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=8)
    message: str = Field(default="", max_length=2000)


class FeedbackOut(BaseModel):
    id: str
    submitted: bool = True
