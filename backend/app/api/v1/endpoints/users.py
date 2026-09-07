import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserUpdate, UserResponse
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

@router.put(
    "/me",
    response_model=UserResponse,
)
def update_user_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the current user's profile information.
    """
    user_repo = UserRepository(db)
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    if not update_data:
        return current_user
        
    updated_user = user_repo.update(current_user, update_data)
    return updated_user


@router.post(
    "/me/avatar",
    response_model=UserResponse,
)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a profile picture for the current user.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided is not an image",
        )
        
    # Generate unique filename
    extension = os.path.splitext(file.filename)[1]
    if not extension:
        extension = ".png" # fallback
        
    filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join("static", "avatars", filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}",
        )
        
    avatar_url = f"/static/avatars/{filename}"
    
    user_repo = UserRepository(db)
    updated_user = user_repo.update(current_user, {"profile_image": avatar_url})
    
    return updated_user
