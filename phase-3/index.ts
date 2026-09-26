import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ====================== TOOLS DEFINITION ======================
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_current_datetime",
      description: "Get the current date and time",
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
      description: "Evaluate a simple math expression. Example: 25 * 4 + 10",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The math expression to evaluate (e.g. 12 + 8 * 3)",
          },
        },
        required: ["expression"],
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
    // Simple safe evaluation (only numbers and basic operators)
    const cleaned = expression.replace(/[^0-9+\-*/().\s]/g, "");
    const result = Function(`"use strict"; return (${cleaned})`)();
    return `Result: ${result}`;
  } catch (error) {
    return `Error: Could not calculate "${expression}"`;
  }
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

    // Agar model ne tool call nahi kiya → final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content;
    }

    // Tool calls execute karo
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
      } else {
        result = `Unknown tool: ${functionName}`;
      }

      console.log(`   Result: ${result}`);

      // Tool result messages mein daalo
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}

// ====================== MAIN CHAT ======================
async function main() {
  console.log("🤖 Phase-3 Agent started! (Tools enabled)");
  console.log("Type 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages: any[] = [
    {
      role: "system",
      content:
        "You are a helpful AI agent. You have access to tools. Use them when needed. Be concise and clear.",
    },
  ];

  const ask = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      messages.push({ role: "user", content: input });

      try {
        const answer = await runAgent(messages);
        console.log(`\nAgent: ${answer}\n`);
      } catch (err: any) {
        console.error("Error:", err.message);
      }

      ask();
    });
  };

  ask();
}

main();