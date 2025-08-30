# Welcome to the SSF2025 in PARA

## Quick Start

가상환경 생성 및 활성화

```
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/MacOS
source venv/bin/activate
```

외부 라이브러리 다운로드 및 백엔드 서버 실행

```
cd backend
pip install -r requirements.txt

uvicorn main:app --reload
```

프론트엔드 실행

```
cd frontend
python -m http.server 3000
```
