import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as readline from "readline";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function callAgent(systemPrompt: string, userMessage: string) {
  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  return response.choices[0].message.content || "";
}

async function multiAgent(query: string) {
  console.log("\n🔍 Researcher Agent working...");
  const research = await callAgent(
    "You are a Researcher Agent. Extract key facts and information clearly and briefly.",
    query
  );
  console.log("Research:", research);

  console.log("\n✍️ Writer Agent working...");
  const finalAnswer = await callAgent(
    "You are a Writer Agent. Take the research and write a clear, friendly, well-structured final answer.",
    `Research:\n${research}\n\nOriginal question: ${query}`
  );

  return finalAnswer;
}

async function main() {
  console.log("🤖 Phase-8 Multi-Agent System Started!");
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

      try {
        const answer = await multiAgent(input);
        console.log(`\nFinal Answer:\n${answer}\n`);
      } catch (err: any) {
        console.error("Error:", err.message);
      }
      ask();
    });
  };
  ask();
}

main();