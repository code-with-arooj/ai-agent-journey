import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") }); // root se .env read karega

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ====================== FILES ======================
const MEMORY_FILE = path.join(__dirname, "memory.json");
const NOTES_FILE = path.join(__dirname, "notes.json");

// ====================== HELPERS ======================
function loadJSON(filePath: string, defaultValue: any) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {
    console.log("Could not load:", filePath);
  }
  return defaultValue;
}

function saveJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ====================== TOOLS ======================
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_current_datetime",
      description: "Get current date and time in Pakistan",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculator",
      description: "Evaluate math expression. Example: 45 * 12 + 8",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression" },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_note",
      description: "Save important information as a note",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          content: { type: "string", description: "Note content" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_notes",
      description: "Read all saved notes",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ====================== TOOL FUNCTIONS ======================
function getCurrentDatetime(): string {
  return new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "full",
    timeStyle: "long",
  });
}

function calculator(expression: string): string {
  try {
    const cleaned = expression.replace(/[^0-9+\-*/().\s]/g, "");
    const result = Function(`"use strict"; return (${cleaned})`)();
    return `Result: ${result}`;
  } catch {
    return `Error calculating: ${expression}`;
  }
}

function saveNote(title: string, content: string): string {
  const notes = loadJSON(NOTES_FILE, []);
  notes.push({ title, content, savedAt: new Date().toISOString() });
  saveJSON(NOTES_FILE, notes);
  return `Note saved: "${title}"`;
}

function readNotes(): string {
  const notes = loadJSON(NOTES_FILE, []);
  if (notes.length === 0) return "No notes found.";
  return notes
    .map((n: any, i: number) => `${i + 1}. ${n.title}: ${n.content}`)
    .join("\n");
}

// ====================== AGENT LOOP ======================
async function runAgent(messages: any[]) {
  let step = 1;

  while (true) {
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      tools,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;
    messages.push(message);

    // Final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content;
    }

    // Tool execution
    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      console.log(`\n🔧 Step ${step} → Tool: ${name}`);
      if (Object.keys(args).length) console.log("   Args:", args);

      let result = "";
      if (name === "get_current_datetime") result = getCurrentDatetime();
      else if (name === "calculator") result = calculator(args.expression);
      else if (name === "save_note") result = saveNote(args.title, args.content);
      else if (name === "read_notes") result = readNotes();
      else result = `Unknown tool: ${name}`;

      console.log(`   Result: ${result}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });

      step++;
    }
  }
}

// ====================== MAIN ======================
async function main() {
  console.log("🤖 Phase-5 Agent Started!");
  console.log("Features: Multi-step Reasoning + Tools + Persistent Memory");
  console.log("Type 'exit' to quit\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let messages: any[] = loadJSON(MEMORY_FILE, [
    {
      role: "system",
      content: `You are a smart AI agent. 
When a task needs multiple steps, think step-by-step.
Use tools when needed. 
Be clear and helpful.`,
    },
  ]);

  const ask = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        saveJSON(MEMORY_FILE, messages);
        console.log("\nMemory saved. Bye!");
        rl.close();
        return;
      }

      messages.push({ role: "user", content: input });

      try {
        const answer = await runAgent(messages);
        console.log(`\nAgent: ${answer}\n`);
        saveJSON(MEMORY_FILE, messages);
      } catch (err: any) {
        console.error("Error:", err.message);
      }

      ask();
    });
  };

  ask();
}

main();