import crypto from "crypto";
import fs from 'fs/promises';
import path from 'path';

import {select, input, editor} from '@inquirer/prompts';
import "dotenv/config";


import {renderHeaderTwee, renderNodeTwee} from "./renderTwee.js";
import { dir } from "console";

const PATH_SAVES = "./save";
const EXT_SAVES = ".json";

import * as NodeStore from "./nodeStore.js";
import { get } from "http";
import { setSetting, getSetting } from "./prompts/setting.js";


//tree structure:
// - node: id, parentId, parentChoice, text, choices

//choices are (id, text) pairs


// ## State
let currentNodeId = null;

let saveFile = null;


/* 
todo:
    - prefetch next nodes
    - indicate explored nodes
    - inject failure states
    - possibly estimate action successes
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

    //!!! get user input for the setting
    let setting = await editor({message: "Enter the setting for this story", default: getSetting()});
    setSetting(setting);

    //generate the start node
    currentNodeId = (await NodeStore.getRootNode()).id;

    //save the state
    await saveState(saveFile, {nodes:JSON.parse(NodeStore.serialize()), currentNodeId});
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
    //!!!embarrasing
    NodeStore.deserialize(JSON.stringify(state.nodes));
    currentNodeId = state.currentNodeId;

    //!!! file load error handling
}

while (true) {
    let currentNode = await NodeStore.getNode(currentNodeId);
    displayNodeConsole(currentNode);

    let choices = currentNode.choices.map(({text, id})=>({value:id, name:text}));
    
    choices.push({value:"#other", name: "other", description:"enter a custom action"});
    choices.push({value:"#back", name:"back", description:"go back to the previous page"});
    choices.push({value: "#edit", name:"edit", description:"edit this story page"});
    
    let choice = await select({message:"Choose an option:", choices});
    
    if (!choice.startsWith("#")) {
        currentNodeId =  choice;
    }

    //go back to the parent node
    else if (choice == "#back") {
        currentNodeId = currentNode.parentId;
    }
    
    //edit this node
    else if (choice == "#edit") {
        let text = await editor({message: "Edit this page", default: currentNode.text});
        currentNode.text = text;
        //!!! save the new text
        //!!! regenerate choices?
    }
    //otherwise this is a custom response
    else if (choice == "#other") {
        let choice = await input({message:"What is your action?"});

        //add this choice to the node
//        let newChoiceId=crypto.randomUUID();
//       currentNode.choices.push({"id": newChoiceId, "text": choice});

        //!!! need to use the NodeStore to add this choice to the node 

        //generate a new node based on that choice
        let currentNodeId = newChoiceId;
    }

    //save the state
    //!!! this is so lame
    await saveState(saveFile, {nodes:JSON.parse(NodeStore.serialize()), currentNodeId});
}

function displayNodeConsole(node) { 
    console.log(node.text);
//    for (let i=0; i<node.choices.length; i++) {
//        console.log(`${i+1}: ${node.choices[i].text}`);
//    }
//    console.log("<: back");
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
