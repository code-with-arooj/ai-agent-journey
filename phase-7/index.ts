import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MEMORY_FILE = path.join(__dirname, "memory.json");
const KNOWLEDGE_FILE = path.join(__dirname, "knowledge.txt");

function loadJSON(filePath: string, defaultValue: any) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {}
  return defaultValue;
}

function saveJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function loadKnowledge(): string {
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      return fs.readFileSync(KNOWLEDGE_FILE, "utf-8");
    }
  } catch {}
  return "No knowledge base found.";
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_knowledge",
      description: "Search information from the knowledge base",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_current_datetime",
      description: "Get current date and time",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

function searchKnowledge(query: string): string {
  const knowledge = loadKnowledge();
  // Simple keyword search (basic RAG)
  const lines = knowledge.split("\n").filter((line) => line.trim());
  const matched = lines.filter((line) =>
    line.toLowerCase().includes(query.toLowerCase())
  );

  if (matched.length === 0) {
    return `No relevant information found for "${query}". Full knowledge:\n${knowledge}`;
  }
  return `Relevant info:\n${matched.join("\n")}`;
}

function getCurrentDatetime() {
  return new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "full",
    timeStyle: "long",
  });
}

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

    if (!message.tool_calls?.length) return message.content;

    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      console.log(`\n🔧 Tool: ${name}`);
      if (Object.keys(args).length) console.log("   Args:", args);

      let result = "";
      if (name === "search_knowledge") result = searchKnowledge(args.query);
      else if (name === "get_current_datetime") result = getCurrentDatetime();
      else result = `Unknown tool: ${name}`;

      console.log(`   Result: ${result}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}

async function main() {
  console.log("🤖 Phase-7 Agent Started! (Simple RAG)");
  console.log("Type 'exit' to quit\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let messages: any[] = loadJSON(MEMORY_FILE, [
    {
      role: "system",
      content: `You are a helpful AI agent with access to a knowledge base. 
Always use the search_knowledge tool when the user asks about personal information or stored knowledge.
Be accurate and only use information from the knowledge base.`,
    },
  ]);

  const ask = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        saveJSON(MEMORY_FILE, messages);
        console.log("Memory saved. Bye!");
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