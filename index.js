import "dotenv/config";
import request from "./request.js";

import {renderHeaderTwee, renderNodeTwee} from "./renderTwee.js";
import {createNodePrompt, createStartingPrompt} from "./createPrompt.js";
import parseTextAndChoicesFromResponse from "./parseTextAndChoicesFromResponse.js";

import crypto from "crypto";

import PQueue from 'p-queue';

import fs from 'fs';


const OUTPUT_FILE = "./data/output.twee";
let output = null;

function createOutput() {
	console.log(`Create output file: ${OUTPUT_FILE}`)

	output = fs.createWriteStream(OUTPUT_FILE, {
	  flags: 'w' // open the file for writing
	})
}
createOutput();

//tree structure:
// - node: id, parentId, parentChoice, text, choices

//choices are (id, text) pairs

//too much coupling of this implicit tree structure among modules... 
//should define a class at least

// ## State
//database of nodes
const nodes = {};
let currentNode = null;

//create promise queue
const queue = new PQueue({concurrency: 5});

//generate first node
const ROOT_NODE_ID = "Start";

let rootNode = await generateStartNode();
nodes[rootNode.id] = rootNode;
currentNode = rootNode;

//output.write(renderHeaderTwee(ROOT_NODE_ID));

while (true) {
    displayNodeConsole(currentNode);
    let input = await getChoiceConsole(); 

    //this should load an already-existing node if it has previously been generated
    if (/^\d$/.test(input)) {
        //get the choice index
        let choiceNum = parseInt(input);
        let choiceIndex = choiceNum-1;
        //if it exists, set it to the current node
        if (nodes[currentNode.choices[choiceIndex].id]) {
            currentNode = nodes[currentNode.choices[choiceIndex].id];
        }
        //otherwise generate and update current
        else {
            let newNode = await generateNodeFromChoice(nodes, currentNode, choiceIndex)
            nodes[newNode.id] = newNode;
            currentNode = newNode;
        }
    }
    //go back to the parent node
    else if (input == "<" || input =="back" || input == "b") {
        currentNode = nodes[currentNode.parentId];
    }
    //otherwise this is a custom response
    else {
        let choice = input;
        //add this choice to the node
        let newChoiceId=crypto.randomUUID();
        currentNode.choices.push({"id": newChoiceId, "text": choice});
        let choiceIndex = currentNode.choices.length-1;

        //generate a new node based on that choice
        let newNode = await generateNodeFromChoice(nodes, currentNode, choiceIndex)
        nodes[newNode.id] = newNode;
        currentNode = newNode;
    }

}
async function generateStartNode() {
    //create starting message
    let messages = createStartingPrompt();
    let id = ROOT_NODE_ID;
    let parentId = null;
    let parentChoice = null

    let node = {id, parentId, parentChoice};
    let textAndChoices = await requestTextAndChoices(messages);
    node = Object.assign(node, textAndChoices);
    return node;
}

async function generateNodeFromChoice(nodes, node, choiceIndex) {
    let messages = createNodePrompt(nodes, node, node.choices[choiceIndex].text);
    let newNode = {id: node.choices[choiceIndex].id, parentId: node.id, parentChoice: node.choices[choiceIndex].text};
    let textAndChoices = await requestTextAndChoices(messages);
    newNode = Object.assign(newNode, textAndChoices);
    return newNode;
}

async function requestTextAndChoices(messages) {
    let response = await queue.add(() => request(messages));
    let responseContent = response.choices[0].message.content;

    let node = parseTextAndChoicesFromResponse(responseContent);
    return node;
}

function displayNodeConsole(node) { 
    console.log(node.text);
    for (let i=0; i<node.choices.length; i++) {
        console.log(`${i+1}: ${node.choices[i].text}`);
    }
    console.log("<: back");
}

function getChoiceConsole() {
    return new Promise((resolve, reject) => {
        process.stdin.once('data', function (data) {
            resolve(data.toString().trim());
        });
    });
}




//await generateNodesRec(messages, id, parentId, parentChoice, 0);
