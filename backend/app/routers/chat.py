from fastapi import APIRouter, HTTPException
from schemas import GetResponse, FunctionsRequest, FunctionsResponse, MessageResponse
from services import ChatService

router = APIRouter(
    prefix="/chat", tags=["chat"],
    responses={404: {"description": "Not found"}},
)

chat_service = ChatService()

@router.post("/functions", response_model=FunctionsResponse)
async def get_functions(request: FunctionsRequest):
    try:
        role, message, created_at = request.role, request.message, request.created_at
        functions = chat_service.get_functions(role, message, created_at)
        return FunctionsResponse(functions=functions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message", response_model=MessageResponse)
async def generate_message():
    try:
        message = chat_service.generate_message()
        return MessageResponse(message=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get", response_model=GetResponse)
async def get_chat():
    try:
        chat = chat_service.get()
        return GetResponse(data=chat)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
