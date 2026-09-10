# 🧠 AI MindMap (MindVault AI)

A dedicated, real-time collaborative mind mapping tool where Artificial Intelligence seamlessly generates, expands, and connects your ideas. Built for an advanced 5-month internship project.

## ✨ Key Features

*   **🤖 Text-to-Mindmap Generation:** Instantly convert any topic or text prompt into a fully structured, hierarchical mind map. Includes a **Depth Control** parameter to manage the scope of broad topics.
*   **🧠 Context-Aware Auto-Expansion:** Select any node and instruct the AI to generate highly relevant subtopics and explore concepts deeper.
*   **🔗 Connection Discovery:** Uncover hidden relationships across different branches of your map using AI-assisted connection discovery.
*   **⭐ Smart Prioritization:** Ask the AI to highlight the most critical nodes. Important concepts are automatically emphasized with distinctive typography and markers.
*   **🎨 Algorithmic Graph Coloring:** Features a custom frontend tree-traversal algorithm that dynamically assigns beautiful, cascading color themes and distinct shapes to branches without cluttering the database.
*   **⚡ Real-Time Collaboration:** Co-edit mind maps with your team with live cursor tracking and instant node synchronization powered by WebSockets.
*   **📥 Import & Export:** Export your creations to High-Res **PNG**, **Markdown (MD)**, or **OPML**. Import existing OPML/MD files to visualize them instantly.

## 🏗️ Technical Architecture

The application follows a clean, modern architecture pipeline:
`Input → NLP Structure Extraction (Gemini) → Mind Map Generator → Interactive Canvas (React Flow)`

### Tech Stack
*   **Frontend:** React, TypeScript, Tailwind CSS, React Flow (for interactive node canvas), Vite.
*   **Backend:** Python, FastAPI, SQLAlchemy (ORM), Alembic (Migrations), WebSockets.
*   **Database:** PostgreSQL.
*   **AI Engine:** Google Gemini (gemini-1.5-flash) for NLP structure extraction and relationship identification.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   PostgreSQL running locally or via Docker
*   A Google Gemini API Key

### 1. Database Setup
Ensure PostgreSQL is running and create a database named `ai_mindmap` (or your preferred name).

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # (On Windows use: venv\Scripts\activate)
pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/ai_mindmap
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=your_gemini_api_key_here
```
Run migrations and start the server:
```bash
alembic upgrade head
uvicorn app.main:app --reload
```
*The backend will run at `http://localhost:8000`*

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1
```
Start the development server:
```bash
npm run dev
```
*The frontend will run at `http://localhost:8081` (or whichever port Vite assigns)*

## 🛡️ Edge Cases Handled
*   **Broad Topics:** Addressed via dynamic Depth Control (Levels 1-5).
*   **Collaboration Conflicts:** Addressed via real-time WebSocket syncing (Last-Write-Wins strategy).
*   **Malformed AI Output:** Addressed via strict JSON schema validation and fallback error handling in the FastAPI backend.
