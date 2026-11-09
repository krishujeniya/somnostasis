"""Ground truth feedback and delayed label collection."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.db_models import FeedbackLog, PredictionLog
from backend.app.models.schemas import FeedbackCreate

router = APIRouter(prefix="/feedback", tags=["Continuous Evaluation Feedback"])


@router.post("")
def record_prediction_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
):
    """
    Record verified clinical ground-truth label for a past prediction.
    Enables delayed outcome analysis and model performance degradation tracking.
    """
    pred = db.query(PredictionLog).filter(PredictionLog.id == payload.prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction log not found")

    existing_feedback = db.query(FeedbackLog).filter(FeedbackLog.prediction_id == payload.prediction_id).first()
    if existing_feedback:
        existing_feedback.actual_class = payload.actual_class
        existing_feedback.notes = payload.notes
        db.commit()
        return {"status": "updated", "id": existing_feedback.id}

    feedback = FeedbackLog(
        prediction_id=payload.prediction_id,
        actual_class=payload.actual_class,
        notes=payload.notes,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {"status": "created", "id": feedback.id}
