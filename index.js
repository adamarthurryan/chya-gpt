import "dotenv/config";
import request from "./request.js";

import {renderHeader, renderNode} from "./renderTwee.js";
import {createNodePrompt, createStartingPrompt} from "./createPrompt.js";
import parseNodeFromResponse from "./parseNodeFromResponse.js";

import PQueue from 'p-queue';

import fs from 'fs';


const ROOT_NODE_ID = "Start";

const OUTPUT_FILE = "./data/output.twee";
let output = null;

function createOutput() {
	console.log(`Create output file: ${OUTPUT_FILE}`)

	output = fs.createWriteStream(OUTPUT_FILE, {
	  flags: 'w' // open the file for writing
	})

    output.write(renderHeader(ROOT_NODE_ID));
}
createOutput();

//tree structure:
// - node: id, parentId, parentChoice, text, choices

//choices are (id, text) pairs

//too much coupling of this implicit tree structure among modules... 
//should define a class at least


let STARTING_MODEL="gpt-4";
let DEPTH_MODEL="gpt-3.5-turbo";

//create promise queue
const queue = new PQueue({concurrency: 20});

const nodes = {};


//for debugging
let MAX_DEPTH = 5;

async function generateNodesRec(messages, id, parentId, parentChoice, depth) {
    //don't go too deep
    if (depth >= MAX_DEPTH) return;

    console.log(`Generating id:${id} depth:${depth} messages.length:${messages.length}`);

    let response = await queue.add(() => request(messages));
    let responseContent = response.choices[0].message.content;
    let node = parseNodeFromResponse(responseContent);
    node.id = id;
    node.parentId = parentId;
    node.parentChoice = parentChoice;

    nodes[id] = node;

    console.log("Generated ", id, depth);
    
    //write to twee file
    let twee = renderNode(node);
    console.log(twee);
    output.write(twee)


    for (let choice of node.choices) {
        let messages = createNodePrompt(nodes, node, choice.text);
        let id = choice.id;
        let parentId = node.id;
        generateNodesRec(messages, id, parentId, choice.text, depth+1);
    }
}

//create starting message
let messages = createStartingPrompt();
let id = ROOT_NODE_ID;
let parentId = null;
let parentChoice = null

await generateNodesRec(messages, id, parentId, parentChoice, 0);

//let twee = renderNodeToTwee(nodes, nodes["Start"]);
//console.log(twee);

//build a tree structure with each story path
//enqueue each leaf as a request and build it out as a node when the request resolves
//use a global cap on the number of requests to keep things under control

let requestCount = 0;

