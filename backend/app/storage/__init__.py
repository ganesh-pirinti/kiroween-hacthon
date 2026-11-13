"""Ghost Protocol storage package."""

from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository

__all__ = ["Database", "StorageRepository"]
