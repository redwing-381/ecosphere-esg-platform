"""Aggregate router mounting every module under /api/v1."""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.departments.router import router as departments_router
from app.modules.employees.router import router as employees_router
from app.modules.environmental.router import router as environmental_router
from app.modules.settings.router import router as settings_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(departments_router)
api_router.include_router(employees_router)
api_router.include_router(environmental_router)
api_router.include_router(settings_router)
