export function renderHeader(rootNodeId) {
    return `:: StoryTitle
Choose Your Own Adventure GPT

:: StoryData
{
    "format": "Harlowe",
    "format-version": "3.3.6",
    "start": "${rootNodeId}"
}

`;
}

export function renderNode(node) {
    let string = `:: ${node.id}\n`;
    string += node.text;
    string += "\n";
    for (let choice of node.choices) {
        string += `[[${choice.text}|${choice.id}]]\n`;
    }
    
    string += "\n";

    return string;
}