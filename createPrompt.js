import systemPrompt from "./prompts/system.js"
import settingPrompt from './prompts/setting.js'

//create a prompt for a story node incorporating its ancestors recursively
export function createNodePrompt(nodes, node, choice) {
    let messages = createStartingPrompt();
    
    messages.push(...createNodeMessages(nodes, node));
    messages.push({ "role": "user", "content": choice });

    return messages;
}

//create a starting prompt with the system message and story setting
export function createStartingPrompt() {
    let messages = [];
    messages.push({ "role": "system", "content": systemPrompt });
    messages.push({ "role": "user", "content": settingPrompt });

    return messages;
}

//recursively generate messages for the node and all its ancestors
function createNodeMessages(nodes, node) {
    let messages;
    if (node.parentId != null) 
        messages = createNodeMessages(nodes, nodes[node.parentId]);
    else
        messages = [];

    if (node.parentChoice)
        messages.push({ "role": "user", "content": node.parentChoice });

    messages.push({ "role": "assistant", "content": renderNodeToContent(node) });

    return messages;
}

function renderNodeToContent(node) {
    let string = node.text;
    string += "\n\n";
    let i=1;
    for (let choice of node.choices) {
        string += `${i}. ${choice.text}\n`;
    }
    return string;
}