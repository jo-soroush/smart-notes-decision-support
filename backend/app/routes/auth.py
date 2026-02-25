from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password, get_password_hash
from app.db import get_db
from app.models.user import UserModel

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(
    email: str,
    password: str,
    db: Session = Depends(get_db),
):
    exists = db.query(UserModel).filter(UserModel.email == email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserModel(
        email=email,
        hashed_password=get_password_hash(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}