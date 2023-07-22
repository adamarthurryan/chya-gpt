export function renderHeaderTwee(rootNodeId) {
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

export function renderNodeTwee(node) {
    let string = `:: ${node.id}\n`;
    string += node.text;
    string += "\n";
    for (let choice of node.choices) {
        string += `[[${choice.text}|${choice.id}]]\n`;
    }
    
    string += "\n";

    return string;
}