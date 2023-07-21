import crypto from "crypto";


//extract the choices from the response and return a node
//basically just extract any numbered list items and treat them as choices
export default function parseNodeFromResponse(content) {
    //extract the numbered list items from the content string
    //also return the non-choice part of the content string
    let choices = [];
    let text = "";
    let lines = content.split("\n");
    for (let line of lines) {
        //check if the line starts with a number
        if (/^\d+\.\s/.test(line)) {
            //extract the choice text
            let choiceText = line.match(/^\d+\.\s(.*)/)[1];
            //create a new guid for the choice
            let choiceID = crypto.randomUUID();
            choices.push({ "id": choiceID, "text": choiceText });
        } else {
            text += line + "\n";
        }
    }


    return { "text": text, "choices": choices };
}

