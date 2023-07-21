const URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4";

async function request (messages, model=MODEL) {
    const response = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: 450,
        }),
    });

    //handle HTML error status
    if (!response.ok) {
        console.log(messages);
        throw new Error("Server error: "+response.statusText);
    }
            
    
    return await response.json();
}

export default request;