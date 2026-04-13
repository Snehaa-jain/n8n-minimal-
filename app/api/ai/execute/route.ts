import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

function replaceTemplateVariables(text: string, input: any): string {
  if (!text || typeof text !== "string") return text;

  let result = text.replace(
    /\{\{input\}\}/g,
    typeof input === "object" ? JSON.stringify(input) : String(input)
  );

  result = result.replace(
    /\{\{input\.([^}]+)\}\}/g,
    (match: string, path: string) => {
      const fields = path.split(".");
      let value = input;
      for (const field of fields) {
        if (value && typeof value === "object" && field in value) {
          value = value[field];
        } else {
          return match;
        }
      }
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  );

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { type, config, input } = await request.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key not configured. Add GROQ_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const model = "llama-3.3-70b-versatile";

    let result;
    switch (type) {
      case "aiTextGenerator":
        result = await executeTextGenerator(config, input, groq, model);
        break;
      case "aiAnalyzer":
        result = await executeAnalyzer(config, input, groq, model);
        break;
      case "aiChatbot":
        result = await executeChatbot(config, input, groq, model);
        break;
      case "aiDataExtractor":
        result = await executeDataExtractor(config, input, groq, model);
        break;
      default:
        return NextResponse.json({ error: `Unknown AI node type: ${type}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI execution error:", error);
    return NextResponse.json(
      { error: error.message || "AI execution failed" },
      { status: 500 }
    );
  }
}

async function executeTextGenerator(config: any, input: any, groq: Groq, model: string) {
  let { prompt, temperature, maxTokens } = config;
  prompt = replaceTemplateVariables(prompt, input);

  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: parseFloat(temperature || "0.7"),
    max_tokens: parseInt(maxTokens || "500"),
  });

  return { generatedText: completion.choices[0].message.content, model };
}

async function executeAnalyzer(config: any, input: any, groq: Groq, model: string) {
  let { text, analysisType } = config;
  text = replaceTemplateVariables(text, input);

  const systemPrompts: Record<string, string> = {
    sentiment: "Analyze the sentiment of the following text. Respond with: Positive, Negative, or Neutral, followed by a confidence score (0-1) and brief explanation.",
    keywords: "Extract the most important keywords and phrases from the following text. Return them as a JSON array.",
    summary: "Provide a concise summary of the following text in 2-3 sentences.",
  };

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompts[analysisType] || "" },
      { role: "user", content: text },
    ],
    temperature: 0.3,
  });

  return { analysisType, result: completion.choices[0].message.content };
}

async function executeChatbot(config: any, input: any, groq: Groq, model: string) {
  let { systemPrompt, userMessage, personality } = config;
  systemPrompt = replaceTemplateVariables(systemPrompt, input);
  userMessage = replaceTemplateVariables(userMessage, input);

  const personalityPrompts: Record<string, string> = {
    professional: "Respond in a professional and formal manner.",
    friendly: "Respond in a warm, friendly, and conversational manner.",
    concise: "Respond with brief, to-the-point answers.",
  };

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: `${systemPrompt}\n\n${personalityPrompts[personality] || ""}` },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  });

  return { response: completion.choices[0].message.content, personality };
}

async function executeDataExtractor(config: any, input: any, groq: Groq, model: string) {
  let { text, schema } = config;
  text = replaceTemplateVariables(text, input);
  schema = replaceTemplateVariables(schema, input);

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: `Extract information from the text according to this schema: ${schema}. Return ONLY a valid JSON object matching the schema, with no additional text or explanation.` },
      { role: "user", content: text },
    ],
    temperature: 0.1,
  });

  const extractedData = completion.choices[0].message.content?.replace(/```json|```/g, "").trim();

  try {
    return { extractedData: JSON.parse(extractedData || "{}"), schema };
  } catch {
    return { extractedData, schema, note: "Could not parse as JSON, returning raw text" };
  }
}