from pydantic import BaseModel
from typing import Dict, Any

class PlaylistResponse(BaseModel):
    playlist: Dict[str, Any]
