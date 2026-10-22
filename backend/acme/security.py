"""Single-operator demo auth. Replace with individual SSO identities in production."""
import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
import os

from fastapi import Request

from .domain import DomainError


@dataclass(frozen=True)
class Settings:
    database_path: str = "data/acme.sqlite3"
    admin_password: str = "local-demo-only"
    production: bool = False
    app_origin: str = ""
    frontend_dir: str = "frontend/dist"

    def __post_init__(self):
        if self.production and (len(self.admin_password) < 16 or self.admin_password == "local-demo-only"):
            raise RuntimeError("Production requires ADMIN_PASSWORD with at least 16 characters.")
        if self.production and not self.app_origin.startswith("https://"):
            raise RuntimeError("Production requires the canonical HTTPS APP_ORIGIN.")

    @classmethod
    def from_environment(cls):
        return cls(database_path=os.getenv("DATABASE_PATH", "data/acme.sqlite3"),
                   admin_password=os.getenv("ADMIN_PASSWORD", "local-demo-only"),
                   production=os.getenv("APP_ENV") == "production", app_origin=os.getenv("APP_ORIGIN", "").rstrip("/"),
                   frontend_dir=os.getenv("FRONTEND_DIR", "frontend/dist"))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def login(db, settings, password, client):
    now = int(time.time())
    key = digest(client)
    with db.transaction() as connection:
        connection.execute("DELETE FROM login_attempts WHERE attempted_at < ?", (now - 60,))
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
        attempts = connection.execute("SELECT count(*) FROM login_attempts WHERE client_hash=?", (key,)).fetchone()[0]
        if attempts >= 10:
            raise DomainError("Too many sign-in attempts. Try again in one minute.", 429)
        connection.execute("INSERT INTO login_attempts VALUES(?,?)", (key, now))
        valid = hmac.compare_digest(digest(password), digest(settings.admin_password))
        if valid:
            token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            connection.execute("INSERT INTO sessions VALUES(?,?,?)", (digest(token), csrf, now + 8 * 3600))
    # Raise after commit so failed attempts are counted as well.
    if not valid:
        raise DomainError("Incorrect workspace password.", 401)
    return token, csrf


def require_session(request: Request):
    token = request.cookies.get("acme_session", "")
    with request.app.state.db.connect() as connection:
        session = connection.execute("SELECT * FROM sessions WHERE token_hash=? AND expires_at>?", (digest(token), int(time.time()))).fetchone()
    if not session:
        raise DomainError("Please sign in to continue.", 401)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), session["csrf"]):
            raise DomainError("Your session could not be verified. Reload and try again.", 403)
    return dict(session)
