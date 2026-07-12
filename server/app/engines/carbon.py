"""Carbon calculation engine: converts operations into emission records."""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import ValidationError
from app.models.enums import CarbonOrigin
from app.models.environmental import CarbonTransaction, OperationalActivity
from app.models.master import EmissionFactor


def calculate_co2e(quantity: Decimal, factor_value: Decimal) -> Decimal:
    """Return emissions in CO2e for a quantity and an emission factor value."""
    return Decimal(quantity) * Decimal(factor_value)


def carbon_from_activity(
    db: Session, activity: OperationalActivity, origin: CarbonOrigin = CarbonOrigin.AUTO
) -> CarbonTransaction:
    """Build a carbon transaction from an activity, freezing the factor value.

    Raises when no emission factor is linked, so auto-calculation never
    silently produces a zero or incorrect emission.
    """
    if activity.emission_factor_id is None:
        raise ValidationError("An emission factor is required to calculate carbon")

    factor = db.get(EmissionFactor, activity.emission_factor_id)
    co2e = calculate_co2e(activity.quantity, factor.factor_value)
    return CarbonTransaction(
        operational_activity_id=activity.id,
        department_id=activity.department_id,
        emission_factor_id=factor.id,
        quantity=activity.quantity,
        factor_value_snapshot=factor.factor_value,
        co2e=co2e,
        origin=origin,
        date=activity.activity_date,
    )
