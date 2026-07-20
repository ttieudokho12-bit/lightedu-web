import { GoogleGenAI, Type } from "@google/genai";
import { generateQuestions } from "./src/services/gemini.ts";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" }); // if needed, but not there

async function test() {
  try {
    const questions = await generateQuestions("Toán Lớp 2", "Cộng trừ", 2);
    console.log("Success:", questions);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
