import Groq from "groq-sdk";
import "dotenv/config";
import * as readline from "readline";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Yeh array saari baatein yaad rakhega
const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
  {
    role: "system",
    content: "You are a helpful AI assistant. Keep answers short and clear.",
  },
];

async function chat() {
  rl.question("You: ", async (userInput) => {
    if (userInput.toLowerCase() === "exit") {
      console.log("Chat ended. Bye!");
      rl.close();
      return;
    }

    // User ka message add karo
    messages.push({ role: "user", content: userInput });

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: messages,
    });

    const reply = response.choices[0].message.content || "No response";
    console.log("AI:", reply);

    // AI ka jawab bhi yaad rakho
    messages.push({ role: "assistant", content: reply });

    // Phir se sawal poocho
    chat();
  });
}

console.log("Phase-2 Chat started! Type 'exit' to quit.\n");
chat();