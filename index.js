import crypto from "crypto";
import fs from 'fs/promises';
import path from 'path';

import PQueue from 'p-queue';
import {select, input, editor} from '@inquirer/prompts';
import "dotenv/config";

import request from "./request.js";

import {renderHeaderTwee, renderNodeTwee} from "./renderTwee.js";
import {createNodePrompt, createStartingPrompt} from "./createPrompt.js";
import parseTextAndChoicesFromResponse from "./parseTextAndChoicesFromResponse.js";
import { dir } from "console";

const PATH_SAVES = "./save";
const EXT_SAVES = ".json";

const ROOT_NODE_ID = "Start";



//create promise queue
const queue = new PQueue({concurrency: 5});

//tree structure:
// - node: id, parentId, parentChoice, text, choices

//choices are (id, text) pairs

//too much coupling of this implicit tree structure among modules... 
//should define a class at least

// ## State
//database of nodes
let nodes = {};
let currentNode = null;


let saveFile = null;


/* 
todo:
    - prefetch next nodes
    - indicate explored nodes
    - inject failure states
    - possibly estimate action successes
    - allow select save / load file
    - auto save
    - export to twee
    - edit node text?
*/

//should show main menu:
// load save file
// start new adventure

//main menu
let newOrLoad = await select({
    message: "Load an existing game or start new?",
    choices: [ 
        {
            name: "New",
            value: "new",
            description: "Start a new game"
        },
        {
            name: "Load",
            value: "load",
            description: "Load a save game"
        }
    ]
});


//for a new game, pick a name for the save file, generate a start node, and save
if (newOrLoad=="new") {

    //name the save file
    saveFile = await input({ message: 'Enter a name for the save file:' });
    if (!saveFile.endsWith(EXT_SAVES))
        saveFile+=EXT_SAVES;
    saveFile = path.join(PATH_SAVES, saveFile);

    //!!! sanitize filename
    //!!! check if file exists

    const ROOT_NODE_ID = "Start";
    let rootNode = await generateStartNode();
    nodes[rootNode.id] = rootNode;
    currentNode = rootNode;

    saveState(saveFile, {nodes, currentNode});
}

//for load a saved game, get the save file name and load 
else {

    //get the file names in save dir
    const dirEntries = await fs.readdir(PATH_SAVES, {withFileTypes:true});
    const fileChoices = dirEntries.filter(entry => entry.isFile() && entry.name.endsWith(EXT_SAVES)).map(entry=>entry.name).map(name=>({value:name}));

    //prompt to select a save file
    saveFile = await select({ message: 'Choose a save file:', choices:fileChoices});
    saveFile = path.join(PATH_SAVES, saveFile);

    //load the file
    let state = await loadState(saveFile);
    ({nodes, currentNode} = state);

    //!!! file load error handling
}

while (true) {
    displayNodeConsole(currentNode);
    let choices = currentNode.choices.map(({text, id})=>({value:id, name:text}));
    
    choices.push({value:"#other", name: "other", description:"enter a custom action"});
    choices.push({value:"#back", name:"back", description:"go back to the previous page"});
    choices.push({value: "#edit", name:"edit", description:"edit this story page"});
    
    let choice = await select({message:"Choose an option:", choices});
    
    if (!choice.startsWith("#")) {
        //check if this node is already loaded
        if (nodes[choice]) {
            currentNode = nodes[choice];
        }
        //otherwise generate and update current
        else {
            let choiceIndex = currentNode.choices.findIndex(({id}) => id==choice);
            let newNode = await generateNodeFromChoice(nodes, currentNode, choiceIndex)
            nodes[newNode.id] = newNode;
            currentNode = newNode;
        }

    }

    //go back to the parent node
    else if (choice == "#back") {
        currentNode = nodes[currentNode.parentId];
    }
    
    //go back to the parent node
    else if (choice == "#edit") {
        let text = await editor({message: "Edit this page", default: currentNode.text});
        currentNode.text = text;
        //!!! regenerate choices?
    }
    //otherwise this is a custom response
    else if (choice == "#other") {
        let choice = await input({message:"What is your action?"});

        //add this choice to the node
        let newChoiceId=crypto.randomUUID();
        currentNode.choices.push({"id": newChoiceId, "text": choice});
        let choiceIndex = currentNode.choices.length-1;

        //generate a new node based on that choice
        let newNode = await generateNodeFromChoice(nodes, currentNode, choiceIndex)
        nodes[newNode.id] = newNode;
        currentNode = newNode;
    }

    //save the state
    await saveState(saveFile, {nodes, currentNode});

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
    return input({message: "What do you chooose?"});
    return new Promise((resolve, reject) => {
        process.stdin.once('data', function (data) {
            resolve(data.toString().trim());
        });
    });
}

async function saveState(filename, state) {
    //!!! error handling
    //should check output folder
    
    let data = JSON.stringify(state)
    fs.writeFile(filename, data, "utf8")   
}
async function loadState(filename) {
    //!!! error handling
    let data = await fs.readFile(filename,{encoding:"utf8"} );
    let state = JSON.parse(data);
    return state;
}



//await generateNodesRec(messages, id, parentId, parentChoice, 0);
