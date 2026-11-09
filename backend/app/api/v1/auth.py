"""Authentication, user accounts, and API key lifecycle endpoints."""

import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user, require_user
from backend.app.core.security import create_access_token, generate_raw_api_key, get_password_hash, verify_password
from backend.app.database import get_db
from backend.app.models.db_models import APIKey, User
from backend.app.models.schemas import APIKeyCreate, APIKeyCreated, APIKeyOut, Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication & API Keys"])


@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new SaaS tenant/user account."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or "",
        role="engineer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive JWT access token."""
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(require_user)):
    """Get profile of current authenticated user."""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }


@router.post("/api-keys", response_model=APIKeyCreated)
def create_api_key(
    key_in: APIKeyCreate,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new secure API key for programmatic model inference."""
    # If no user authenticated, assign to default tenant (id=1)
    user_id = user.id if user else 1
    raw_key, prefix, hashed = generate_raw_api_key()

    api_key_rec = APIKey(
        user_id=user_id,
        name=key_in.name,
        key_prefix=prefix,
        hashed_key=hashed,
        is_active=True,
    )
    db.add(api_key_rec)
    db.commit()
    db.refresh(api_key_rec)

    return {
        "id": api_key_rec.id,
        "name": api_key_rec.name,
        "key": raw_key,
        "key_prefix": prefix,
        "created_at": api_key_rec.created_at.isoformat(),
    }


@router.get("/api-keys", response_model=list[APIKeyOut])
def list_api_keys(
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active API keys for the current tenant."""
    user_id = user.id if user else 1
    keys = db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.is_active == True).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat(),
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        }
        for k in keys
    ]


@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: int,
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke an active API key."""
    user_id = user.id if user else 1
    k = db.query(APIKey).filter(APIKey.id == key_id, APIKey.user_id == user_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="API Key not found")
    k.is_active = False
    db.commit()
    return {"status": "success", "message": f"API key {k.key_prefix}... revoked"}
