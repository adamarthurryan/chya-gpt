import request from "./request.js";

//import PQueue from 'p-queue';

//create promise queue
//const queue = new PQueue({concurrency: 5});

//queue.on("error", (e) => console.log("p-queue error: " + e));

//map of ids to promise for request
let loading = {};

//return a promise for the request with the given id
export async function startRequest(id, message) {
    //add the request to the queue
    let promise = request(message);

    //add to loading
    loading[id] = promise;

    //wait for the promise to complete
    let response = null;
    try {
        response = await promise;
    }
    catch (e) {
        //if the promise fails, remove from loading and re-throw the error
        delete loading[id];
        throw e;
    }
    let responseContent = response.choices[0].message.content;

    //when promise is complete, remove from loading and return the response
    delete loading[id];
    return responseContent;
}

//return true if the request with the given id is loading
export function isLoading(id) {
    return loading[id] != null;
}

//if the request with the given id is loading, return a promise that resolves to that request when it is loaded
export async function getRequestPromise(id) {
    return loading[id];
} 

