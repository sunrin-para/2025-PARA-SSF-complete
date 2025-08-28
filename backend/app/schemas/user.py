from pydantic import BaseModel
from typing import List, Optional

class PreferencesUpdateRequest(BaseModel):
    genres: Optional[List]=None
    moods: Optional[List]=None
    countries: Optional[List]=None

class UpdateResponse(BaseModel):
    message: str
