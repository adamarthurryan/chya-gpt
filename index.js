import "dotenv/config";
import request from "./request.js";

console.log(process.env.OPENAI_KEY);        

let prompt = "What is your name?";
let messages = [];
messages.push({ "role": "user", "content": prompt });
let response = await request(messages);
console.log(response.choices[0].message);
