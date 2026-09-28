# AI Agent Journey

A complete hands-on journey of building **autonomous AI agents from absolute zero** using TypeScript, Node.js, and the Groq SDK.

This project is designed as a step-by-step learning path — starting from a simple LLM call and ending with multi-agent systems, RAG, external tools, and streaming.

---

## Project Overview

I built this project to deeply understand how real AI agents work under the hood.

Instead of using high-level frameworks, I implemented everything manually so I could learn:

- How tool calling actually works
- How agents maintain memory
- How multi-step reasoning happens
- How to connect external APIs
- How basic RAG works
- How multiple agents can collaborate

---

## Phases Completed

| Phase | Title                          | Description |
|-------|--------------------------------|-----------|
| 01    | Basic LLM Call                 | First API call to an LLM |
| 02    | Conversation Memory            | Chatbot that remembers previous messages |
| 03    | Tools & Function Calling       | Agent can use tools (DateTime + Calculator) |
| 04    | Persistent Memory + Notes      | Memory that survives restarts + Notes system |
| 05    | Multi-step Reasoning           | Agent plans and chains multiple tools |
| 06    | External Tools                 | Live Weather API integration (Open-Meteo) |
| 07    | Simple RAG                     | Document-based Question Answering |
| 08    | Multi-Agent System             | Researcher + Writer agents collaborating |
| 09    | Streaming Responses            | Real-time token-by-token output |
| 10    | Final Polish                   | Clean structure + Documentation |

---

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **LLM Provider:** Groq (openai/gpt-oss-20b)
- **External API:** Open-Meteo (Weather)
- **Tools:** Custom Function Calling
- **Memory:** File-based persistent memory

---

## How to Run

1. Clone the repository
```bash
git clone https://github.com/code-with-arooj/ai-agent-journey.git
cd ai-agent-journey
Install dependencies

Bashnpm install

Add your Groq API key

Bash# Create .env file in root
GROQ_API_KEY=your_key_here

Run any phase

Bashnpx tsx phase-3/index.ts
npx tsx phase-6/index.ts
npx tsx phase-7/index.ts

Key Learnings

How function calling / tool use works internally
Building persistent memory for agents
Multi-step agent loops
Integrating external APIs
Basic Retrieval-Augmented Generation (RAG)
Designing multi-agent systems
Implementing streaming responses


Future Improvements

Proper vector-based RAG (embeddings)
Better evaluation system
Web UI
Deployment
Advanced multi-agent orchestration


Author
Arooj

Learning AI Agents with the goal of becoming a Senior AI Agent Engineer.
GitHub: code-with-arooj

License
This project is open source and available under the MIT License.