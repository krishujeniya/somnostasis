"""Feature attribution and SHAP explainability endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends
from backend.app.api.deps import authenticate_api_or_token
from backend.app.core.explain import explainability_engine
from backend.app.models.db_models import User
from backend.app.models.schemas import ExplainRequest, ExplainResponse

router = APIRouter(prefix="/explain", tags=["Model Explainability"])


@router.post("", response_model=ExplainResponse)
def get_shap_explanation(
    payload: ExplainRequest,
    user: Optional[User] = Depends(authenticate_api_or_token),
):
    """
    Calculate real-time SHAP feature attributions for a given prediction.
    Explains which physiological signals pushed the model toward the predicted stress level.
    """
    feature_dict = payload.features.dict()
    res = explainability_engine.explain(feature_dict, model_key=payload.model_key)
    return res
