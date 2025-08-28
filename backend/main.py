import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
sys.path.append("./app/")
from routers import chat, playlist, user
from schemas import ResetResponse
from services import ChatService, PlaylistService, UserService

app = FastAPI(title="2025 SSF Para Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chat_service = ChatService()
playlist_service = PlaylistService()
user_service = UserService()

app.include_router(chat.router)
app.include_router(playlist.router)
app.include_router(user.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Para in 2025 SSF"}

@app.post("/reset", response_model=ResetResponse)
def reset():
    try:
        chat_service.reset()
        playlist_service.reset()
        user_service.reset()
        return ResetResponse(message="success")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
