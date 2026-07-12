"""Populate the database with a rich, demo-ready ESG dataset.

Resets all tables and inserts a coherent organization: departments, people,
carbon activities, CSR and training records, governance data, gamification
and rewards. Balances, ledgers and badge awards are kept internally
consistent so live scores, the leaderboard and the simulator look realistic.

Run from the server directory:  python seed.py
"""
from datetime import date

from sqlalchemy import text

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.engines.carbon import carbon_from_activity
from app.models.enums import (
    ActivityType,
    ApprovalStatus,
    BadgeMetric,
    CategoryType,
    ChallengeStatus,
    IssueSeverity,
    IssueStatus,
    LedgerReason,
    NotificationType,
    Pillar,
    UserRole,
)
from app.models.environmental import OperationalActivity
from app.models.gamification import (
    BadgeAward,
    Challenge,
    ChallengeParticipation,
    PointsLedger,
    XpLedger,
)
from app.models.governance import Audit, ComplianceIssue, PolicyAcknowledgement
from app.models.master import (
    Badge,
    Category,
    Department,
    EmissionFactor,
    EnvironmentalGoal,
    ESGPolicy,
    Reward,
    Training,
)
from app.models.notification import Notification, NotificationSetting
from app.models.organization import Organization
from app.models.people import Employee, User
from app.models.social import (
    CSRActivity,
    EmployeeParticipation,
    TrainingAssignment,
    TrainingCompletion,
)

TODAY = date(2026, 7, 12)
PASSWORD = "Password123"

# name, department code, gender, title, role
# A dedicated, non-participating administrator account (no employee record).
ADMIN_EMAIL = "admin@ecosphere.com"
ADMIN_NAME = "Platform Admin"

PEOPLE = [
    ("Priya Sharma", "HR", "Female", "Sustainability Lead", UserRole.EMPLOYEE),
    ("Arjun Mehta", "MFG", "Male", "Plant Manager", UserRole.DEPT_HEAD),
    ("Neha Verma", "LOG", "Female", "Fleet Coordinator", UserRole.DEPT_HEAD),
    ("Rohan Iyer", "OPS", "Male", "Operations Analyst", UserRole.DEPT_HEAD),
    ("Sara Khan", "MFG", "Female", "Line Engineer", UserRole.EMPLOYEE),
    ("Vikram Rao", "MFG", "Male", "Technician", UserRole.EMPLOYEE),
    ("Ananya Nair", "LOG", "Female", "Dispatch Officer", UserRole.EMPLOYEE),
    ("Karan Singh", "LOG", "Male", "Driver Lead", UserRole.EMPLOYEE),
    ("Meera Joshi", "OPS", "Female", "Operations Coordinator", UserRole.EMPLOYEE),
    ("Dev Patel", "HR", "Male", "HR Associate", UserRole.DEPT_HEAD),
]

DEPARTMENTS = [
    ("Manufacturing", "MFG"),
    ("Logistics", "LOG"),
    ("Operations", "OPS"),
    ("People & Culture", "HR"),
]

# type, department, quantity, unit, factor name
ACTIVITIES = [
    (ActivityType.MANUFACTURING, "MFG", 300, "kg", "Steel"),
    (ActivityType.PURCHASE, "MFG", 400, "kWh", "Grid Electricity"),
    (ActivityType.FLEET, "LOG", 250, "litre", "Diesel Fleet"),
    (ActivityType.PURCHASE, "OPS", 150, "kWh", "Grid Electricity"),
    (ActivityType.EXPENSE, "OPS", 200, "km", "Business Travel"),
    (ActivityType.EXPENSE, "HR", 100, "km", "Business Travel"),
]

FACTORS = [
    ("Grid Electricity", ActivityType.PURCHASE, "kWh", 0.82, 2),
    ("Diesel Fleet", ActivityType.FLEET, "litre", 2.68, 1),
    ("Steel", ActivityType.MANUFACTURING, "kg", 1.85, 1),
    ("Business Travel", ActivityType.EXPENSE, "km", 0.15, 3),
]

# department -> (goal target in kg co2e)
GOAL_TARGETS = {"MFG": 800, "LOG": 500, "OPS": 200, "HR": 10}

TRAININGS = [
    ("Code of Conduct", Pillar.GOVERNANCE, True),
    ("Diversity & Inclusion", Pillar.SOCIAL, True),
    ("Workplace Safety", Pillar.SOCIAL, False),
]
# employee name -> number of trainings completed (first N)
TRAINING_COMPLETIONS = {
    "Priya Sharma": 3, "Arjun Mehta": 3, "Neha Verma": 2, "Rohan Iyer": 2,
    "Sara Khan": 2, "Vikram Rao": 1, "Ananya Nair": 2, "Karan Singh": 1,
    "Meera Joshi": 2, "Dev Patel": 1,
}

POLICIES = [
    ("Code of Conduct", Pillar.GOVERNANCE),
    ("Data Privacy Policy", Pillar.GOVERNANCE),
    ("Anti-Corruption Policy", Pillar.GOVERNANCE),
]
# employee name -> number of policies acknowledged (first N)
ACKS = {
    "Priya Sharma": 3, "Arjun Mehta": 3, "Neha Verma": 3, "Rohan Iyer": 2,
    "Sara Khan": 3, "Vikram Rao": 2, "Ananya Nair": 2, "Karan Singh": 1,
    "Meera Joshi": 1, "Dev Patel": 3,
}

CSR_ACTIVITIES = [
    ("Tree Plantation Drive", "Green Initiative", 40, 20),
    ("City Beach Cleanup", "Community", 40, 20),
    ("Food Donation Camp", "Community", 40, 20),
]
# employee name -> list of CSR activity indices they are approved for
CSR_APPROVED = {
    "Arjun Mehta": [0, 1, 2],
    "Sara Khan": [0],
    "Vikram Rao": [1],
    "Neha Verma": [0],
    "Ananya Nair": [2],
    "Rohan Iyer": [1],
    "Priya Sharma": [0],
}

# title, xp, points, difficulty, status
CHALLENGES = [
    ("Cycle to Work Week", 60, 30, "easy", ChallengeStatus.ACTIVE),
    ("Zero Paper Month", 50, 25, "medium", ChallengeStatus.ACTIVE),
    ("Solar Panel Proposal", 120, 60, "hard", ChallengeStatus.COMPLETED),
]
# employee name -> list of challenge indices they are approved for
CHALLENGE_APPROVED = {
    "Arjun Mehta": [0, 2],
    "Priya Sharma": [0, 1],
    "Neha Verma": [0],
    "Rohan Iyer": [1],
    "Sara Khan": [0],
    "Dev Patel": [2],
}

BADGES = [
    ("Green Starter", "Earn your first 50 XP", BadgeMetric.TOTAL_XP, 50),
    ("Eco Warrior", "Reach 150 XP", BadgeMetric.TOTAL_XP, 150),
    ("Community Champion", "Join 3 CSR activities", BadgeMetric.CSR_ACTIVITIES, 3),
    ("Challenge Master", "Complete 2 challenges", BadgeMetric.COMPLETED_CHALLENGES, 2),
]

REWARDS = [
    ("Eco Water Bottle", "Reusable steel bottle", 50, 20),
    ("Tree in Your Name", "We plant a tree for you", 100, 50),
    ("Company Hoodie", "Limited edition sustainable hoodie", 200, 15),
    ("Extra Day Off", "One paid day off", 500, 5),
]


def reset() -> None:
    """Drop and recreate the public schema so it matches the ORM exactly."""
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    Base.metadata.create_all(bind=engine)


def seed() -> None:  # noqa: C901 - a linear seed reads clearer in one place
    db = SessionLocal()

    db.add(Organization(name="EcoSphere Industries", weight_env=40, weight_social=30, weight_gov=30))

    depts = {code: Department(name=name, code=code) for name, code in DEPARTMENTS}
    db.add_all(depts.values())
    db.flush()

    people: dict[str, Employee] = {}
    for name, code, gender, title, _role in PEOPLE:
        emp = Employee(
            name=name,
            email=f"{name.split()[0].lower()}@ecosphere.com",
            department_id=depts[code].id,
            job_title=title,
            gender=gender,
            join_date=date(2024, 1, 15),
        )
        people[name] = emp
        db.add(emp)
    db.flush()

    heads = {"MFG": "Arjun Mehta", "LOG": "Neha Verma", "OPS": "Rohan Iyer", "HR": "Dev Patel"}
    for code, head_name in heads.items():
        depts[code].head_employee_id = people[head_name].id

    pw = hash_password(PASSWORD)
    # Standalone administrator with no employee record (non-participating).
    db.add(User(email=ADMIN_EMAIL, name=ADMIN_NAME, password_hash=pw, role=UserRole.ADMIN))
    for name, _c, _g, _t, role in PEOPLE:
        emp = people[name]
        db.add(User(email=emp.email, name=emp.name, password_hash=pw, role=role, employee_id=emp.id))

    factors = {}
    for fname, atype, unit, value, scope in FACTORS:
        f = EmissionFactor(
            name=fname, activity_type=atype, unit=unit,
            factor_value=value, ghg_scope=scope, effective_date=date(2026, 1, 1),
        )
        factors[fname] = f
        db.add(f)
    db.flush()

    # Spread activities across the last several months so the emissions trend is meaningful.
    _base_month = 2026 * 12 + 6 - 1  # 0-based index for June 2026
    for i, (atype, code, qty, unit, fname) in enumerate(ACTIVITIES):
        idx = _base_month - (i % 9)
        activity = OperationalActivity(
            type=atype, department_id=depts[code].id, quantity=qty, unit=unit,
            emission_factor_id=factors[fname].id,
            activity_date=date(idx // 12, idx % 12 + 1, 15),
        )
        db.add(activity)
        db.flush()
        db.add(carbon_from_activity(db, activity))

    for code, target in GOAL_TARGETS.items():
        db.add(EnvironmentalGoal(
            name=f"{code} carbon reduction", department_id=depts[code].id,
            metric="co2e", baseline=target * 1.3, target=target, unit="kg",
            start_date=date(2026, 1, 1), end_date=date(2026, 12, 31),
        ))

    trainings = []
    for tname, pillar, mandatory in TRAININGS:
        t = Training(name=tname, pillar=pillar, mandatory=mandatory)
        trainings.append(t)
        db.add(t)
    db.flush()
    admin_emp = people["Priya Sharma"]
    for emp in people.values():
        for t in trainings:
            db.add(TrainingAssignment(
                training_id=t.id, employee_id=emp.id, assigned_by=admin_emp.id
            ))
    for name, count in TRAINING_COMPLETIONS.items():
        for t in trainings[:count]:
            db.add(TrainingCompletion(
                training_id=t.id, employee_id=people[name].id, completed_at=date(2026, 5, 20)
            ))

    policies = []
    for pname, pillar in POLICIES:
        p = ESGPolicy(name=pname, pillar=pillar, effective_date=date(2026, 1, 1), requires_ack=True)
        policies.append(p)
        db.add(p)
    db.flush()
    for name, count in ACKS.items():
        for p in policies[:count]:
            db.add(PolicyAcknowledgement(
                employee_id=people[name].id, policy_id=p.id, policy_version=p.version
            ))

    categories = {
        "Green Initiative": Category(name="Green Initiative", type=CategoryType.CSR),
        "Community": Category(name="Community", type=CategoryType.CSR),
    }
    db.add_all(categories.values())
    db.flush()

    csr = []
    for cname, cat, xp, pts in CSR_ACTIVITIES:
        a = CSRActivity(
            name=cname, category_id=categories[cat].id, activity_date=date(2026, 6, 15),
            xp_reward=xp, points_reward=pts, capacity=25,
        )
        csr.append(a)
        db.add(a)
    db.flush()

    xp_totals: dict[str, int] = {name: 0 for name in people}
    pts_totals: dict[str, int] = {name: 0 for name in people}

    def award(name: str, xp: int, pts: int, reason: LedgerReason, src_type: str, src_id: int) -> None:
        emp_id = people[name].id
        if xp:
            db.add(XpLedger(employee_id=emp_id, delta=xp, reason=reason, source_type=src_type, source_id=src_id))
            xp_totals[name] += xp
        if pts:
            db.add(PointsLedger(employee_id=emp_id, delta=pts, reason=reason, source_type=src_type, source_id=src_id))
            pts_totals[name] += pts

    csr_counts: dict[str, int] = {name: 0 for name in people}
    for name, indices in CSR_APPROVED.items():
        for i in indices:
            activity = csr[i]
            db.add(EmployeeParticipation(
                employee_id=people[name].id, csr_activity_id=activity.id,
                approval_status=ApprovalStatus.APPROVED,
                xp_earned=activity.xp_reward, points_earned=activity.points_reward,
                completion_date=date(2026, 6, 16),
            ))
            award(name, activity.xp_reward, activity.points_reward, LedgerReason.CSR_APPROVED, "csr", activity.id)
            csr_counts[name] += 1

    challenges = []
    for title, xp, pts, difficulty, status in CHALLENGES:
        c = Challenge(title=title, xp_reward=xp, points_reward=pts, difficulty=difficulty, status=status)
        challenges.append(c)
        db.add(c)
    db.flush()

    challenge_counts: dict[str, int] = {name: 0 for name in people}
    for name, indices in CHALLENGE_APPROVED.items():
        for i in indices:
            c = challenges[i]
            db.add(ChallengeParticipation(
                challenge_id=c.id, employee_id=people[name].id, progress=100,
                approval_status=ApprovalStatus.APPROVED,
                xp_awarded=c.xp_reward, points_awarded=c.points_reward,
            ))
            award(name, c.xp_reward, c.points_reward, LedgerReason.CHALLENGE_APPROVED, "challenge", c.id)
            challenge_counts[name] += 1

    for name, emp in people.items():
        emp.xp_balance = xp_totals[name]
        emp.points_balance = pts_totals[name]

    badges = {}
    for bname, desc, metric, threshold in BADGES:
        b = Badge(name=bname, description=desc, metric=metric, threshold=threshold)
        badges[bname] = b
        db.add(b)
    db.flush()

    def qualifies(name: str, metric: BadgeMetric, threshold: int) -> bool:
        if metric == BadgeMetric.TOTAL_XP:
            return xp_totals[name] >= threshold
        if metric == BadgeMetric.CSR_ACTIVITIES:
            return csr_counts[name] >= threshold
        return challenge_counts[name] >= threshold

    for bname, _desc, metric, threshold in BADGES:
        for name in people:
            if qualifies(name, metric, threshold):
                db.add(BadgeAward(badge_id=badges[bname].id, employee_id=people[name].id))
                db.add(Notification(
                    recipient_id=people[name].id, type=NotificationType.BADGE_UNLOCK,
                    message=f"You unlocked the {bname} badge!",
                ))

    for rname, desc, points, stock in REWARDS:
        db.add(Reward(name=rname, description=desc, points_required=points, stock=stock))

    audits = {
        "MFG": Audit(name="Q2 Manufacturing Safety Audit", type="safety",
                     department_id=depts["MFG"].id, audit_date=date(2026, 5, 10), passed=True),
        "LOG_pass": Audit(name="Fleet Compliance Review", type="compliance",
                          department_id=depts["LOG"].id, audit_date=date(2026, 4, 20), passed=True),
        "LOG_fail": Audit(name="Warehouse Standards Audit", type="operational",
                          department_id=depts["LOG"].id, audit_date=date(2026, 6, 1), passed=False),
        "OPS": Audit(name="Operations Governance Audit", type="governance",
                     department_id=depts["OPS"].id, audit_date=date(2026, 5, 25), passed=True),
        "HR": Audit(name="HR Policy Audit", type="governance",
                    department_id=depts["HR"].id, audit_date=date(2026, 3, 15), passed=True),
    }
    db.add_all(audits.values())
    db.flush()

    db.add(ComplianceIssue(
        audit_id=audits["MFG"].id, severity=IssueSeverity.HIGH,
        description="Emergency exit partially obstructed on assembly line",
        owner_id=people["Sara Khan"].id, created_by=people["Arjun Mehta"].id,
        due_date=date(2026, 6, 15), status=IssueStatus.OPEN, is_overdue=True,
    ))
    db.add(ComplianceIssue(
        audit_id=audits["LOG_fail"].id, severity=IssueSeverity.MEDIUM,
        description="Incomplete cold-chain temperature logs",
        owner_id=people["Neha Verma"].id, created_by=people["Priya Sharma"].id,
        due_date=date(2026, 8, 1), status=IssueStatus.IN_PROGRESS, is_overdue=False,
    ))

    for ntype in NotificationType:
        db.add(NotificationSetting(type=ntype, in_app_enabled=True, email_enabled=False))

    db.commit()
    db.close()


def main() -> None:
    reset()
    seed()
    print("Seed complete: 4 departments, 10 employees, carbon, CSR, governance and gamification data.")
    print(f"Admin (non-participating): {ADMIN_EMAIL} / {PASSWORD}")
    print(f"Dept head: arjun@ecosphere.com / {PASSWORD}  ·  Employee: priya@ecosphere.com / {PASSWORD}")


if __name__ == "__main__":
    main()
