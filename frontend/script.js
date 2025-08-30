from fastapi import APIRouter, HTTPException
from schemas import ResetResponse, PreferencesUpdateRequest, UpdateResponse
from services import UserService
from .chat import chat_service

router = APIRouter(
    prefix="/user", tags=["user"],
    responses={404: {"description": "Not found"}},
)

user_service = UserService()
@router.post("/preferences", response_model=UpdateResponse)
def update_preferences(request: PreferencesUpdateRequest):
    try:
        moods, genres, countries = request.moods, request.genres, request.countries
        message = user_service.update_preferences(moods, genres, countries)
        chat_service.update_preferences()
        return UpdateResponse(message=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset", response_model=ResetResponse)
def reset():
    try:
        message = user_service.reset()
        return ResetResponse(message=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
