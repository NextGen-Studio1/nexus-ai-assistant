# 🤖 AI Agent Web Application (FastAPI + LangChain + Groq + Buffer Memory)

A full-stack, responsive AI Agent web application built with **FastAPI**, **LangChain ReAct**, **Groq LPU**, and **ConversationBufferMemory**.

---

## ✨ Features

- **ReAct Reasoning Agent**: Automatically reasons and calls tools before arriving at a final answer.
- **Active Buffer Memory**: Retains conversation history across turns per session (`session_id`).
- **Interactive Memory Inspector**: Modal allowing users or assignment evaluators to inspect the exact contents of `ConversationBufferMemory` in real time.
- **Built-in Tools**:
  - 🧮 `calculator`: Evaluates mathematical expressions using Python's `math` module.
  - 🌤️ `get_weather`: Provides weather data for cities (Delhi, Mumbai, London, New York, Tokyo).
  - 🧠 `knowledge_base`: Technical knowledge base for AI/ML/LangChain concepts.
- **Modern ChatGPT-like UI**: Dark-mode glassmorphic interface with Markdown rendering, auto-expanding input, suggestion chips, and responsive mobile sidebar.

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up Your Groq API Key
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and paste your Groq API key:
```env
GROQ_API_KEY=gsk_...
```
*(You can get a free key at [console.groq.com/keys](https://console.groq.com/keys))*

### 3. Start the Server
```bash
python app.py
```
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🌐 How to Share Publicly (So Anyone Can Use It)

### Method 1: Instant Free Public Link with LocalTunnel (No Sign-up)
While your app is running locally on port 8000:
1. Open a new terminal.
2. Run:
   ```bash
   npx localtunnel --port 8000
   ```
3. It will give you a public URL (e.g. `https://funny-tiger-42.loca.lt`) that anyone in the world can open on their phone or laptop!

---

### Method 2: Permanent Free Cloud Deployment on Render.com (Recommended for Assignments)
1. Push this folder to a GitHub repository.
2. Go to [Render.com](https://render.com) and sign in with GitHub.
3. Click **New +** -> **Web Service**.
4. Select your repository.
5. Set:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. Under **Environment Variables**, add:
   - Key: `GROQ_API_KEY`
   - Value: `your_groq_api_key`
7. Click **Deploy Web Service**.
Render will give you a permanent `https://your-agent.onrender.com` link to submit!

---

### Method 3: Running & Sharing Directly from Google Colab
If you want to run everything inside Google Colab, create a new notebook or add a cell with:

```python
# 1. Install dependencies
!pip install -q fastapi uvicorn pyngrok langchain langchain-groq langchain-community python-dotenv

# 2. Download or upload files and set your Groq key
import os
os.environ["GROQ_API_KEY"] = "your_groq_api_key_here"

# 3. Start ngrok tunnel & Uvicorn
from pyngrok import ngrok
import nest_asyncio
import uvicorn
from app import app

# Authenticate ngrok (free at ngrok.com)
ngrok.set_auth_token("YOUR_NGROK_TOKEN")
public_url = ngrok.connect(8000)
print(f"🌍 Public Shareable Webpage: {public_url}")

nest_asyncio.apply()
uvicorn.run(app, port=8000)
```
