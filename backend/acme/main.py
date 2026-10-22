import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .database import Database
from .domain import (
    COUNTRIES,
    CURRENCIES,
    DEPARTMENTS,
    Country,
    Currency,
    Department,
    DirectoryFilter,
    DomainError,
    EmployeeChange,
    EmployeeInput,
)
from .employees import (
    activity,
    create_employee,
    employee_detail,
    list_employees,
    update_employee,
)
from .imports import csv_template, export_csv, import_csv, preview_csv
from .reports import compensation_report
from .security import RequestSizeLimit, Settings, digest, login, require_session


class LoginInput(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class CSVInput(BaseModel):
    csv_text: str = Field(min_length=1, max_length=3000000)


class ImportInput(CSVInput):
    checksum: str = Field(pattern=r"^[a-f0-9]{64}$")


def create_app(settings=None):
    settings = settings or Settings.from_environment()
    db = Database(settings.database_path)

    @asynccontextmanager
    async def lifespan(app):
        db.initialize()
        yield

    app = FastAPI(
        title="ACME Compensation API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.production else "/api/docs",
        redoc_url=None,
        openapi_url=None if settings.production else "/api/openapi.json",
    )
    app.state.db = db
    app.add_middleware(RequestSizeLimit)

    @app.middleware("http")
    async def security_headers(request, call_next):
        if request.url.path.startswith("/api/") and request.method not in (
            "GET",
            "HEAD",
            "OPTIONS",
        ):
            origin = request.headers.get("origin")
            expected = settings.app_origin or str(request.base_url).rstrip("/")
            if origin and origin != expected:
                return JSONResponse(
                    {"message": "Cross-origin writes are not permitted."},
                    status_code=403,
                )
            content_length = request.headers.get("content-length", "0")
            if not content_length.isdigit() or int(content_length) > 4_000_000:
                return JSONResponse(
                    {"message": "Request is too large."}, status_code=413
                )
        response = await call_next(request)
        response.headers.update(
            {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "Referrer-Policy": "no-referrer",
                "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
            }
        )
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        if settings.production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    @app.exception_handler(DomainError)
    async def domain_error(request, error):
        return JSONResponse(
            {"message": error.message, **error.details}, status_code=error.status
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        fields = [
            {"field": ".".join(map(str, item["loc"][1:])), "message": item["msg"]}
            for item in error.errors()
        ]
        return JSONResponse(
            {"message": "Please check the supplied values.", "errors": fields},
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request, error):
        logging.getLogger(__name__).exception("Unhandled request failure")
        return JSONResponse(
            {"message": "An unexpected error occurred. Please retry."}, status_code=500
        )

    @app.get("/health")
    def health():
        with db.connect() as connection:
            connection.execute("SELECT 1 FROM employees LIMIT 1").fetchone()
        return {"status": "ok"}

    @app.post("/api/login")
    def sign_in(data: LoginInput, request: Request):
        token, csrf = login(
            db,
            settings,
            data.password,
            request.client.host if request.client else "unknown",
        )
        response = JSONResponse({"name": "HR Manager", "csrf_token": csrf})
        response.set_cookie(
            "acme_session",
            token,
            max_age=8 * 3600,
            httponly=True,
            secure=settings.production,
            samesite="strict",
        )
        return response

    @app.get("/api/session")
    def session(current=Depends(require_session)):
        return {"name": "HR Manager", "csrf_token": current["csrf"]}

    @app.post("/api/logout", dependencies=[Depends(require_session)])
    def sign_out(request: Request):
        with db.transaction() as connection:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash=?",
                (digest(request.cookies.get("acme_session", "")),),
            )
        response = JSONResponse({"ok": True})
        response.delete_cookie("acme_session")
        return response

    @app.get("/api/metadata", dependencies=[Depends(require_session)])
    def metadata():
        return {
            "countries": COUNTRIES,
            "currencies": CURRENCIES,
            "departments": DEPARTMENTS,
        }

    @app.get("/api/employees", dependencies=[Depends(require_session)])
    def employees(filters: Annotated[DirectoryFilter, Query()]):
        return list_employees(db, filters)

    @app.get("/api/employees/export", dependencies=[Depends(require_session)])
    def download_employees(filters: Annotated[DirectoryFilter, Query()]):
        return Response(
            export_csv(db, filters),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": 'attachment; filename="acme-employees.csv"'
            },
        )

    @app.post(
        "/api/employees", status_code=201, dependencies=[Depends(require_session)]
    )
    def add_employee(data: EmployeeInput):
        return create_employee(db, data)

    @app.get("/api/employees/{employee_id}", dependencies=[Depends(require_session)])
    def detail(employee_id: int):
        return employee_detail(db, employee_id)

    @app.put("/api/employees/{employee_id}", dependencies=[Depends(require_session)])
    def edit_employee(employee_id: int, data: EmployeeChange):
        return update_employee(db, employee_id, data)

    @app.get("/api/reports", dependencies=[Depends(require_session)])
    def report(
        currency: Currency,
        group_by: Literal["country", "department"] = "department",
        country: Country | None = None,
        department: Department | None = None,
    ):
        return compensation_report(db, currency, group_by, country, department)

    @app.get("/api/activity", dependencies=[Depends(require_session)])
    def recent_activity(page: int = Query(1, ge=1, le=100000)):
        return activity(db, page)

    @app.get("/api/import/template", dependencies=[Depends(require_session)])
    def template():
        return Response(
            csv_template(),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": 'attachment; filename="acme-import-template.csv"'
            },
        )

    @app.post("/api/import/preview", dependencies=[Depends(require_session)])
    def validate_import(data: CSVInput):
        return preview_csv(db, data.csv_text)

    @app.post(
        "/api/import/commit", status_code=201, dependencies=[Depends(require_session)]
    )
    def commit_import(data: ImportInput):
        return import_csv(db, data.csv_text, data.checksum)

    static = Path(settings.frontend_dir)
    if static.is_dir():
        app.mount("/", StaticFiles(directory=static, html=True), name="frontend")
    return app


app = create_app()
