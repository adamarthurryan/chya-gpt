//recursively output the node and all it's children to a Twee-language string
export default function renderNodeToTwee(nodes, rootNode) {
    let string = `:: StoryTitle
Choose Your Own Adventure GPT

:: StoryData
{
    "format": "Harlowe",
    "format-version": "3.3.6",
    "start": "${rootNode.id}"
}`;

    string += "\n\n";

    string += renderNodeToTweeRec(nodes, rootNode);

    return string;
}

//recursively render the node and its children to a Twee-language string
function renderNodeToTweeRec(node) {
    let string = `:: ${node.id}\n`;
    string += node.text;
    string += "\n";
    for (let choice of node.choices) {
        string += `[[${choice.text}|${choice.id}]]\n`;
    }
    
    string += "\n";

    for (let choice of node.choices) {
        if (node[choice.id]) {
            string += renderNodeToTweeRec(node[choice.id]);
            string += "\n";
        }
    }

    return string;
}
