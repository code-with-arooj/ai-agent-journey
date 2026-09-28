import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MEMORY_FILE = path.join(__dirname, "memory.json");
const NOTES_FILE = path.join(__dirname, "notes.json");

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
      description: "Evaluate math expression",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_note",
      description: "Save a note",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_notes",
      description: "Read all notes",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "Get current weather of any city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name e.g. Lahore, Karachi, London" },
        },
        required: ["city"],
      },
    },
  },
];

function getCurrentDatetime() {
  return new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "full",
    timeStyle: "long",
  });
}

function calculator(expression: string) {
  try {
    const cleaned = expression.replace(/[^0-9+\-*/().\s]/g, "");
    return `Result: ${Function(`"use strict"; return (${cleaned})`)()}`;
  } catch {
    return `Error calculating ${expression}`;
  }
}

function saveNote(title: string, content: string) {
  const notes = loadJSON(NOTES_FILE, []);
  notes.push({ title, content, savedAt: new Date().toISOString() });
  saveJSON(NOTES_FILE, notes);
  return `Note saved: ${title}`;
}

function readNotes() {
  const notes = loadJSON(NOTES_FILE, []);
  if (!notes.length) return "No notes found.";
  return notes.map((n: any, i: number) => `${i + 1}. ${n.title}: ${n.content}`).join("\n");
}

async function getWeather(city: string) {
  try {
    // Step 1: Get coordinates
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.[0]) return `City "${city}" not found.`;

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: Get weather
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    const weatherData = await weatherRes.json();
    const w = weatherData.current_weather;

    return `Weather in ${name}, ${country}:
Temperature: ${w.temperature}°C
Windspeed: ${w.windspeed} km/h
Weather Code: ${w.weathercode}`;
  } catch (err: any) {
    return `Failed to get weather: ${err.message}`;
  }
}

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

    if (!message.tool_calls?.length) return message.content;

    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      console.log(`\n🔧 Step ${step} → ${name}`);
      if (Object.keys(args).length) console.log("   Args:", args);

      let result = "";
      if (name === "get_current_datetime") result = getCurrentDatetime();
      else if (name === "calculator") result = calculator(args.expression);
      else if (name === "save_note") result = saveNote(args.title, args.content);
      else if (name === "read_notes") result = readNotes();
      else if (name === "get_weather") result = await getWeather(args.city);
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

async function main() {
  console.log("🤖 Phase-6 Agent Started! (External Tools + Weather)");
  console.log("Type 'exit' to quit\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let messages: any[] = loadJSON(MEMORY_FILE, [
    {
      role: "system",
      content: "You are a helpful AI agent with tools including weather. Use tools when needed. Be concise.",
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