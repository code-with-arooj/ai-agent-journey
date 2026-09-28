import Groq from "groq-sdk";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      { role: "user", content: "Hello! Can you introduce yourself in one short sentence?" }
    ],
  });

  console.log(response.choices[0].message.content);
}

main();