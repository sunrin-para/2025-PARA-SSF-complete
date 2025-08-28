import time
from pydantic import BaseModel, Field
from typing import List, Optional

class FunctionsRequest(BaseModel):
    role: str="user"
    message: str
    created_at: int=Field(default_factory=lambda: int(time.time()))

class FunctionsResponse(BaseModel):
    functions: Optional[List]=None

class MessageResponse(BaseModel):
    message: dict
