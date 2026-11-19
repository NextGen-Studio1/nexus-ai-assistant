import os
import math
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

# LangChain imports with flexible fallback for different versions
try:
    from langchain.agents import AgentExecutor, create_react_agent
except ImportError:
    from langchain_classic.agents import AgentExecutor, create_react_agent

try:
    from langchain.memory import ConversationBufferMemory
except ImportError:
    from langchain_classic.memory import ConversationBufferMemory

from langchain.tools import tool
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

# Tool 1: Calculator
@tool
def calculator(expression: str) -> str:
    """Useful for solving math calculations.
    Input must be a valid Python math expression.
    Examples: '2 + 2', 'math.sqrt(144)', '15 * 4 / 2'
    """
    try:
        result = eval(expression, {"math": math, "__builtins__": {}})
        return f"result: {result}"
    except Exception as e:
        return f"Error: {str(e)}"

# Tool 2: Weather
@tool
def get_weather(city: str) -> str:
    """Returns current weather for a given city.
    Input should be a city name like 'Delhi', 'Mumbai', 'London'.
    Use this when user asks about weather.
    """
    weather_db = {
        "delhi": "🌤️ Delhi: 34°C, Partly Cloudy, Humidity 45%",
        "mumbai": "🌧️ Mumbai: 28°C, Light Rain, Humidity 80%",
        "london": "☁️ London: 15°C, Overcast, Humidity 70%",
        "new york": "🌞 New York: 22°C, Sunny, Humidity 55%",
        "tokyo": "🌸 Tokyo: 18°C, Clear, Humidity 60%",
    }
    return weather_db.get(
        city.lower().strip(),
        f"⚠️ No data for '{city}'. Try: Delhi, Mumbai, London, New York, Tokyo"
    )

# Tool 3: Knowledge Base
@tool
def knowledge_base(topic: str) -> str:
    """Returns information about AI and tech topics.
    Input should be a topic like 'machine learning', 'LangChain', 'AI agent'.
    Use this when user asks about AI/tech concepts.
    """
    kb = {
        "langchain": "LangChain is a Python framework for building apps powered by LLMs. It provides tools for chains, agents, memory, and retrieval.",
        "machine learning": "Machine Learning is a subset of AI where models learn patterns from data without being explicitly programmed.",
        "neural network": "A Neural Network is a system of nodes inspired by the human brain, used for tasks like image recognition and NLP.",
        "llm": "Large Language Models (LLMs) are trained on massive text data to understand and generate human language. Examples: GPT-4, Gemini, Claude, LLaMA.",
        "ai agent": "An AI Agent is an LLM that can reason, use tools, and take multi-step actions to achieve a goal autonomously.",
        "groq": "Groq is a company that provides ultra-fast LLM inference using custom LPU hardware. It offers a free API for models like LLaMA3.",
        "react": "ReAct (Reason + Act) is a prompting strategy where the agent alternates between reasoning and taking actions to solve tasks.",
    }
    key = topic.lower().strip()
    for k, v in kb.items():
        if k in key or key in k:
            return v
    return f"No info found for '{topic}'. Try: langchain, machine learning, neural network, llm, ai agent, groq, react"

tools = [calculator, get_weather, knowledge_base]

REACT_PROMPT = PromptTemplate.from_template("""You are a helpful AI assistant. Answer the question using the tools available.

Previous conversation:
{chat_history}

You have access to these tools:
{tools}

Use EXACTLY this format:

Question: the input question
Thought: think about what to do
Action: one of [{tool_names}]
Action Input: input to the action
Observation: result of the action
... (repeat Thought/Action/Action Input/Observation as needed)
Thought: I now know the final answer
Final Answer: the final answer to the question

Important rules:
- Always start with Thought:
- Action must be exactly one of the tool names listed
- Always end with Final Answer:

Begin!

Question: {input}
Thought: {agent_scratchpad}""")

# Session manager to maintain isolated memory per user/browser tab
_session_executors: Dict[str, AgentExecutor] = {}

def get_llm(api_key: str = None):
    chosen_key = api_key or os.getenv("GROQ_API_KEY")
    if not chosen_key:
        raise ValueError("GROQ_API_KEY is not set. Please provide an API key.")
    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return ChatGroq(
        model=model_name,
        temperature=0,
        groq_api_key=chosen_key
    )

def create_agent_for_session(session_id: str, api_key: str = None) -> AgentExecutor:
    llm = get_llm(api_key)
    agent = create_react_agent(
        llm=llm,
        tools=tools,
        prompt=REACT_PROMPT,
    )
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        input_key="input",
        output_key="output",
        return_messages=False
    )
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=True,
        max_iterations=6,
        handle_parsing_errors=True
    )
    _session_executors[session_id] = executor
    return executor

def get_agent_executor(session_id: str, api_key: str = None) -> AgentExecutor:
    if session_id not in _session_executors:
        return create_agent_for_session(session_id, api_key)
    return _session_executors[session_id]

def reset_session_memory(session_id: str):
    if session_id in _session_executors:
        _session_executors[session_id].memory.clear()

def get_session_memory_buffer(session_id: str) -> str:
    if session_id in _session_executors:
        return _session_executors[session_id].memory.buffer
    return ""
