import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function getGroqResponse(query: string) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Summarize the following text concisely:",
        },
        {
          role: "user",
          content: query,
        },
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.5,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error:", error);
    return "";
  }
}
