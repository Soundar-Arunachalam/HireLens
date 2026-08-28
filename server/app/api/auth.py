from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.models import UserORM
from app.models.user import Token, UserCreate, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Create a new user account and return an access token."""
    if db.scalar(select(UserORM).where(UserORM.username == payload.username)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    if db.scalar(select(UserORM).where(UserORM.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = UserORM(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        user=UserPublic.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """Authenticate with username (or email) + password and return an access token."""
    user = db.scalar(
        select(UserORM).where(
            (UserORM.username == form_data.username) | (UserORM.email == form_data.username)
        )
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        user=UserPublic.model_validate(user),
    )


@router.get("/me", response_model=UserPublic)
def me(current_user: UserORM = Depends(get_current_user)) -> UserPublic:
    """Return the currently authenticated user's profile."""
    return UserPublic.model_validate(current_user)
