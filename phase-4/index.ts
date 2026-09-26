import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

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
  } catch (err) {
    console.log("Could not load file:", filePath);
  }
  return defaultValue;
}

function saveJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ====================== TOOLS DEFINITION ======================
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_current_datetime",
      description: "Get the current date and time in Pakistan timezone",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculator",
      description: "Evaluate a math expression. Example: 25 * 4 + 10",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The math expression to evaluate",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_note",
      description: "Save an important note or information for later use",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title of the note",
          },
          content: {
            type: "string",
            description: "The actual content to save",
          },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_notes",
      description: "Read all previously saved notes",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// ====================== TOOL IMPLEMENTATIONS ======================
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
    return `Error: Could not calculate "${expression}"`;
  }
}

function saveNote(title: string, content: string): string {
  const notes = loadJSON(NOTES_FILE, []);
  notes.push({
    title,
    content,
    savedAt: new Date().toISOString(),
  });
  saveJSON(NOTES_FILE, notes);
  return `Note saved successfully: "${title}"`;
}

function readNotes(): string {
  const notes = loadJSON(NOTES_FILE, []);
  if (notes.length === 0) {
    return "No notes found.";
  }
  return notes
    .map(
      (n: any, i: number) =>
        `${i + 1}. ${n.title}\n   ${n.content}\n   (Saved: ${n.savedAt})`
    )
    .join("\n\n");
}

// ====================== AGENT LOOP ======================
async function runAgent(messages: any[]) {
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

    // Execute tools
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      console.log(`\n🔧 Tool called: ${functionName}`);
      if (Object.keys(args).length > 0) {
        console.log(`   Arguments:`, args);
      }

      let result = "";

      if (functionName === "get_current_datetime") {
        result = getCurrentDatetime();
      } else if (functionName === "calculator") {
        result = calculator(args.expression);
      } else if (functionName === "save_note") {
        result = saveNote(args.title, args.content);
      } else if (functionName === "read_notes") {
        result = readNotes();
      } else {
        result = `Unknown tool: ${functionName}`;
      }

      console.log(`   Result: ${result}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}

// ====================== MAIN ======================
async function main() {
  console.log("🤖 Phase-4 Agent started!");
  console.log("Features: Tools + Persistent Memory + Notes");
  console.log("Type 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Load previous conversation memory
  let messages: any[] = loadJSON(MEMORY_FILE, [
    {
      role: "system",
      content:
        "You are a helpful AI agent with memory. You can use tools to get the current time, calculate numbers, save notes, and read previous notes. Always use tools when needed. Be concise.",
    },
  ]);

  const ask = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        // Save memory before exit
        saveJSON(MEMORY_FILE, messages);
        console.log("\nMemory saved. Goodbye!");
        rl.close();
        return;
      }

      messages.push({ role: "user", content: input });

      try {
        const answer = await runAgent(messages);
        console.log(`\nAgent: ${answer}\n`);

        // Save memory after every reply
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