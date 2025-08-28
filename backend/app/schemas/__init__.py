from typing import Any, Optional
from pydantic import BaseModel
from .chat import *
from .playlist import *
from .user import *

class GetResponse(BaseModel):
    data: Optional[Any]

class ResetResponse(BaseModel):
    message: str
