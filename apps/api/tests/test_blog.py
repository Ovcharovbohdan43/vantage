from __future__ import annotations

from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.deps.auth import AuthUser
from app.services.blog_owner import is_blog_owner


OWNER_ID = UUID("db1c0e15-f6f4-4b59-b6b9-b2d56cb508b8")


def test_blog_owner_by_user_id() -> None:
    assert is_blog_owner(AuthUser(id=OWNER_ID, email="other@example.com"))


def test_blog_owner_by_email() -> None:
    assert is_blog_owner(AuthUser(id=uuid4(), email="f62688798@gmail.com"))


def test_non_owner_cannot_publish() -> None:
    assert not is_blog_owner(AuthUser(id=uuid4(), email="reader@example.com"))
