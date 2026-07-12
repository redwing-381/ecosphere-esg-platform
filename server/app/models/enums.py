"""Enumerations shared across the domain models."""
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DEPT_HEAD = "dept_head"
    EMPLOYEE = "employee"


class Status(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class CategoryType(str, enum.Enum):
    CSR = "csr"
    CHALLENGE = "challenge"


class Pillar(str, enum.Enum):
    ENVIRONMENTAL = "environmental"
    SOCIAL = "social"
    GOVERNANCE = "governance"


class ActivityType(str, enum.Enum):
    PURCHASE = "purchase"
    MANUFACTURING = "manufacturing"
    EXPENSE = "expense"
    FLEET = "fleet"


class CarbonOrigin(str, enum.Enum):
    AUTO = "auto"
    MANUAL = "manual"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ChallengeStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    UNDER_REVIEW = "under_review"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class IssueSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class BadgeMetric(str, enum.Enum):
    TOTAL_XP = "total_xp"
    COMPLETED_CHALLENGES = "completed_challenges"
    CSR_ACTIVITIES = "csr_activities"


class LedgerReason(str, enum.Enum):
    CHALLENGE_APPROVED = "challenge_approved"
    CSR_APPROVED = "csr_approved"
    APPROVAL_REVERSED = "approval_reversed"
    REWARD_REDEEMED = "reward_redeemed"


class NotificationType(str, enum.Enum):
    COMPLIANCE_ISSUE = "compliance_issue"
    APPROVAL_DECISION = "approval_decision"
    POLICY_REMINDER = "policy_reminder"
    BADGE_UNLOCK = "badge_unlock"
    TRAINING_ASSIGNED = "training_assigned"
