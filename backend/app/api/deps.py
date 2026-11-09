"""FastAPI dependency injection for authentication, database, and API keys."""

import datetime
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from backend.app.core.security import decode_access_token, hash_api_key
from backend.app.database import get_db
from backend.app.models.db_models import APIKey, User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Retrieve authenticated user from JWT Bearer token."""
    if not credentials:
        return None

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None

    user = db.query(User).filter(User.email == payload["sub"]).first()
    return user


def require_user(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def authenticate_api_or_token(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Allow access via either 'X-API-Key' header, Bearer JWT token,
    or transparent developer fallback for local development.
    """
    if x_api_key:
        hashed = hash_api_key(x_api_key)
        api_key_rec = db.query(APIKey).filter(APIKey.hashed_key == hashed, APIKey.is_active == True).first()
        if not api_key_rec:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key",
            )
        api_key_rec.last_used_at = datetime.datetime.utcnow()
        db.commit()
        return api_key_rec.user

    if credentials:
        user = get_current_user(credentials, db)
        if user:
            return user

    # Public / developer demo mode allowed for dashboard preview
    return None
