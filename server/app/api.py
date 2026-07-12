"""Aggregate router mounting every module under /api/v1."""
from fastapi import APIRouter

from app.modules.analytics.router import router as analytics_router
from app.modules.auth.router import router as auth_router
from app.modules.departments.router import router as departments_router
from app.modules.employees.router import router as employees_router
from app.modules.environmental.router import router as environmental_router
from app.modules.gamification.router import router as gamification_router
from app.modules.governance.router import router as governance_router
from app.modules.notifications.router import router as notifications_router
from app.modules.rewards.router import router as rewards_router
from app.modules.settings.router import router as settings_router
from app.modules.social.router import router as social_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(analytics_router)
api_router.include_router(departments_router)
api_router.include_router(employees_router)
api_router.include_router(environmental_router)
api_router.include_router(gamification_router)
api_router.include_router(governance_router)
api_router.include_router(notifications_router)
api_router.include_router(rewards_router)
api_router.include_router(settings_router)
api_router.include_router(social_router)
