# Example: main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from agentic.arch import agentic_pipeline
import json
from dotenv import load_dotenv
import os

load_dotenv()
print("Loaded API key:", os.getenv("SK_ANT_API_KEY"))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials = True,
    allow_methods=["*"],    
    allow_headers=["*"],
)

@app.post("/generate")
async def generate(request: Request):
    data = await request.json()
    prompt = data.get("prompt")

    result = agentic_pipeline(prompt)
    return result

@app.post("/refine")
async def refine(request: Request):
    data = await request.json()
    prompt = data.get("prompt")
    refine_prompt = data.get("refine_prompt")
    files_dict = data.get("files_dict")
    if not prompt or not refine_prompt or not files_dict:
        return {"error": "Missing prompt, refine_prompt, or files_dict"}
    result = agentic_pipeline(prompt, refine_prompt=refine_prompt, files_dict=files_dict)
    return result