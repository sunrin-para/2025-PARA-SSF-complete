from fastapi import APIRouter, HTTPException, Query
from schemas import GetResponse, PlaylistResponse
from services import PlaylistService

router = APIRouter(
    prefix="/playlist", tags=["playlist"],
    responses={404: {"description": "Not found"}},
)

playlist_service = PlaylistService()

@router.post("/generate", response_model=PlaylistResponse)
def generate_playlist(track_length: int = Query(default=20, description="생성할 트랙 개수", ge=1, le=100)):
    try:
        playlist = playlist_service.generate_playlist(track_length)
        return PlaylistResponse(playlist=playlist)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get", response_model=GetResponse)
async def get_playlist():
    try:
        data = playlist_service.get()
        return GetResponse(data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
