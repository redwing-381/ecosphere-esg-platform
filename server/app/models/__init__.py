"""Import all models so metadata is fully populated for Alembic."""
from app.models.environmental import CarbonTransaction, OperationalActivity
from app.models.gamification import (
    BadgeAward,
    Challenge,
    ChallengeParticipation,
    PointsLedger,
    RewardRedemption,
    XpLedger,
)
from app.models.governance import Audit, ComplianceIssue, PolicyAcknowledgement
from app.models.master import (
    Badge,
    Category,
    Department,
    EmissionFactor,
    ESGPolicy,
    EnvironmentalGoal,
    Product,
    Reward,
    Training,
)
from app.models.notification import Notification, NotificationSetting
from app.models.organization import Organization
from app.models.people import Employee, User
from app.models.scoring import DepartmentScore
from app.models.social import (
    CSRActivity,
    EmployeeParticipation,
    TrainingAssignment,
    TrainingCompletion,
)

__all__ = [
    "Organization",
    "User",
    "Employee",
    "Department",
    "Category",
    "EmissionFactor",
    "Product",
    "EnvironmentalGoal",
    "ESGPolicy",
    "Badge",
    "Reward",
    "Training",
    "OperationalActivity",
    "CarbonTransaction",
    "CSRActivity",
    "EmployeeParticipation",
    "TrainingCompletion",
    "TrainingAssignment",
    "Challenge",
    "ChallengeParticipation",
    "BadgeAward",
    "RewardRedemption",
    "XpLedger",
    "PointsLedger",
    "PolicyAcknowledgement",
    "Audit",
    "ComplianceIssue",
    "DepartmentScore",
    "Notification",
    "NotificationSetting",
]
