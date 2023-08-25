import systemPrompt from "./prompts/system.js"
import {getSetting} from './prompts/setting.js'

//create a prompt for a story node from its path
//the path is a list of {parent, choice} objects

export function createNodePrompt(path) {
    let messages = createStartingPrompt();
    for (let {node, choice} of path) {
        messages.push({"role": "assistant", "content":renderNodeToContent(node)});
        messages.push({ "role": "user", "content": choice.text });
    }

    return messages;
}

//create a starting prompt with the system message and story setting
export function createStartingPrompt() {
    let messages = [];
    messages.push({ "role": "system", "content": systemPrompt });
    messages.push({ "role": "user", "content": getSetting() });

    return messages;
}


function renderNodeToContent(node) {
    let string = node.text;

    let i=1;
    for (let choice of node.choices) {
        string += `${i}. ${choice.text}\n`;
    }
    return string;
}