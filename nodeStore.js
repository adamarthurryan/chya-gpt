

import {createNodePrompt, createStartingPrompt} from "./createPrompt.js";
import parseTextAndChoicesFromResponse from "./parseTextAndChoicesFromResponse.js";
import {startRequest, isLoading, getRequestPromise} from "./requestHandler.js";


export class Node {
    constructor({id, text, choices, parentId}) {
        this.id = id;
        this.text = text;
        this.choices = choices;
        this.parentId = parentId;
    }

    //add a choice to this node
    addChoice(choice) {
        this.choices.push(choice);
    }

    //return the choice with the given id
    getChoice(id) {
        return this.choices.find(({id}) => id==id);
    }
}

export class Choice {
    constructor({id, text}) {
        this.id = id;
        this.text = text;
    }

}

//fully loaded nodes
let nodes = {};
//the parent of each node
//this may be present before the node itself is loaded
let parents = {};


//create a list of nodes and choices from the root to the given node id
//the path is a list of {parent, choice} objects
function buildPath(id) {
    if (parents[id] == null) {
        return [];
    }
    else {
        let parent = parents[id];
        let choice = parent.getChoice(id);
        let path = buildPath(parent.id);
        path.push({parent, choice});
        return path;
    }
}

//return the root node
//if it is not cached, load it
export async function getRootNode() {
    //!!! need special handling and prompt design for the start node
    return getNode(ROOT_NODE_ID);
}

//return the node with the given id
//if it is not cached, load it
//if it is loading, wait until it is complete
export async function getNode(id) {
    console.log("!!! get id: " + id);
    console.log("!!! nodes[id]: " + JSON.stringify(nodes[id]));

    if (nodes[id] == null) {
        //create a story path with nodes and choices
        let path = buildPath(id);
        let parentId = path[path.length-1].parent.id;

        let content = null;
        //if this node is not cached, and if it is not loading, load it
        if (nodes[id] == null && isLoading(id)==false) {

            //create message for node
            let messages = createNodePrompt(path);        

            //load the node
            content = await startRequest(id, messages);
        }
        //otherwise if it is still loadimg, wait until it is comp lete
        else if (nodes[id] == null && isLoading(id)==true) {
            content = await startRequest(id, messages);
        }

        let {text, choices} = parseTextAndChoicesFromResponse(content);
        let node = new Node({id, text, choices, parentId});
        nodes[id] = node;
        parents[id] = parentId;
        
        //start prefetching children
        for (let choice of choices) {
            prefetch(choice.id);
        }

        return node;
    }
    //otherwise return the cached node
    else {

        //start prefetching children
        for (let choice of nodes[id].choices) {
            prefetch(choice.id);
        }

        return nodes[id];
    }
}

//start loading the node with the given id
//when it is loaded, add it to the node store
//!!! this is the same logic as getNode, but it does not return the node or prefetch children - refactor
async function prefetch(id) {
    //if the node is not cached and not loading, load it
    if (nodes[id] == null && isLoading(id)==false) {
        //create a story path with nodes and choices
        let path = buildPath(id);
        let parentId = path[path.length-1] == null ? null : path[path.length-1].parent.id;

        //create message for node
        let messages = createNodePrompt(path);

        //load the node
        let content = await startRequest(id, messages);

        let {text, choices} = parseTextAndChoicesFromResponse(content);
        let node = new Node({id, text, choices, parentId});
        nodes[id] = node;
        parents[id] = parentId;
    }
}

export function serialize() {
    return JSON.stringify(nodes);
}

export function deserialize(json) {
    nodes = JSON.parse(json);
}

//???
function addChoice(node, choice) {
    node.choices.push(choice);
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
