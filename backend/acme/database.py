"""Short-lived connections; each multi-statement write commits atomically."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .domain import DomainError


class Database:
    def __init__(self, path: str):
        self.path = path

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=3, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
        except sqlite3.OperationalError as error:
            if "locked" in str(error).lower() or "busy" in str(error).lower():
                raise DomainError(
                    "Another update is finishing. Please retry shortly.", 503
                ) from error
            raise
        finally:
            connection.close()

    def initialize(self):
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            if version == 0:
                connection.executescript(
                    (Path(__file__).parent / "migrations/001_initial.sql").read_text()
                )
            elif version != 1:
                raise RuntimeError(
                    f"Unsupported database schema {version}; expected 1."
                )

    @contextmanager
    def transaction(self, *, write=True):
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            try:
                yield connection
                connection.commit()
            except BaseException:
                connection.rollback()
                raise
