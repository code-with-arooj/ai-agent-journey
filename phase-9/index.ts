import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function streamResponse(userMessage: string) {
  try {
    const stream = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "You are a helpful AI assistant. Be clear and concise." },
        { role: "user", content: userMessage },
      ],
      stream: true,
    });

    process.stdout.write("\nAgent: ");
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      process.stdout.write(content);
    }
    console.log("\n");
  } catch (err: any) {
    console.error("\n❌ Error:", err.message || err);
  }
}

async function main() {
  console.log("🤖 Phase-9 Streaming Agent Started!");
  console.log("Type 'exit' to quit\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }
      await streamResponse(input);
      ask();
    });
  };
  ask();
}

main();