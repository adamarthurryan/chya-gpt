const URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-3.5-turbo";

const request = async (messages) => {
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
    return await response.json();
}

export default request;