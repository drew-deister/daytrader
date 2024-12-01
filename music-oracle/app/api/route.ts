import { NextResponse } from 'next/server';
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, END, START } from "@langchain/langgraph";
import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { WolframAlphaTool } from "@langchain/community/tools/wolframalpha";
import { DallEAPIWrapper } from "@langchain/openai";


// Define the tool for fetching artist information from Songstats API
const get_artist_information = tool(async ({spotify_artist_id, source, start_date, end_date}) => {
    try {
        const apiUrl = `https://api.songstats.com/enterprise/v1/artists/historic_stats`; // Adjust endpoint as needed

        const response = await axios.get(apiUrl, {
            headers: {
                apikey: 'e0ad5959-b72d-4961-87d0-91243a6d606d', // API key required by Songstats API
            },
            params: {
                source,
                spotify_artist_id,
                start_date,
                end_date,
            },
        });

        return response.data; // Return the API response data
    } catch (error) {
        console.error('Error fetching artist information:', error);
        throw new Error('Failed to fetch artist information');
    }
}, {
    name: 'get_artist_information',
    description: 'Call this tool if you are asked about streaming trends for an artist with a specific Spotify ID.',
    schema: z.object({
        spotify_artist_id: z.string().describe('The Spotify ID of the artist'),
        source: z.string().default('spotify').describe('Source platform for stats'),
        start_date: z.string().default('2024-01-01').describe('Start date for stats (YYYY-MM-DD)'),
        end_date: z.string().default('2024-01-07').describe('End date for stats (YYYY-MM-DD)')
    })
});

// Define the tool for fetching artist information from Songstats API
const get_artist_id = tool(async ({q}) => {
    try {
        const apiUrl = `https://api.songstats.com/enterprise/v1/artists/search`; // Adjust endpoint as needed

        const response = await axios.get(apiUrl, {
            headers: {
                apikey: 'e0ad5959-b72d-4961-87d0-91243a6d606d', // API key required by Songstats API
            },
            params: {
                q,
            },
        });

        return response.data; // Return the API response data
    } catch (error) {
        console.error('Error fetching artist information:', error);
        throw new Error('Failed to fetch artist information');
    }
}, {
    name: 'get_artist_id',
    description: 'Call this tool to get the Spotify ID of a given artist.',
    schema: z.object({
        q: z.string().describe('The name of the artist.'),
    })
});

const image_generator = new DallEAPIWrapper({
  n: 1, // Default
  model: "dall-e-3", // Default
  apiKey: process.env.OPENAI_API_KEY, // Default
});

const search_internet = new TavilySearchResults({
    maxResults: 2,
});

const calculator = new WolframAlphaTool({
    appid: "T2UY6U-VKHUA85QTU",
});

// Function to fetch the Reddit access token
async function fetchRedditAccessToken(grantType = "client_credentials") {
    const clientId = "v3ML5Cf11Cswdze8mL8a4w";
    const clientSecret = "rFFB3hdj1AUOEplrzLa3_Jk3CS7lnw";

    const headers = new Headers();
    // Set up HTTP Basic Auth using client_id as the user and client_secret as the password
    headers.append("Authorization", "Basic " + btoa(`${clientId}:${clientSecret}`));
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const body = new URLSearchParams();
    body.append("grant_type", grantType);

    try {
        const response = await fetch("https://www.reddit.com/api/v1/access_token", {
            method: "POST",
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error("Failed to fetch access token");
        }

        const data = await response.json();
        console.log("Access Token:", data.access_token);
        return data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error);
        throw new Error("Failed to fetch Reddit access token");
    }
}

// Tool to access a specific Reddit endpoint using the access token
const search_reddit = tool(async () => {
    const accessToken = await fetchRedditAccessToken();

    // const headers = new Headers({
    //     'Authorization': `Bearer ${accessToken}`,
    //     'User-Agent': 'macOS:music-oracle:v1.0 (by /u/Severe-Ad8032)',
    //     'Content-Type': 'application/json'
    // });
    // // headers.append("Authorization", `Bearer ${accessToken}`);
    // // // headers.append("User-Agent", "YourApp/0.1"); // Replace with your app details

    // const params = new URLSearchParams({
    //     query: "election predictions",
    //     include_over_18: "true",
    //     include_unadvertisable: "true",
    //     exact: "false",
    //     typeahead_active: "null",
    //     search_query_id: "null"
    // });

    // try {
    //     const response = await fetch(`https://oauth.reddit.com/api/search_reddit_names?${params.toString()}`, {
    //         method: "GET",
    //         headers: headers
    //     });

    //     if (!response.ok) {
    //         console.log(response);
    //         throw new Error("Failed to access Reddit endpoint");
    //     }

    //     const data = await response.json();
    //     return data;
    // } catch (error) {
    //     console.error("Error accessing Reddit endpoint:", error);
    //     throw new Error("Failed to fetch data from Reddit endpoint");
    // }
}, {
    name: 'access_reddit_endpoint',
    description: 'Searches Reddit for a given query.'
});


const tools = [get_artist_information, get_artist_id, search_internet, calculator, image_generator, search_reddit];

// Initialize the Oracle LLM with tools
const modelWithTools = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0.0,
    openAIApiKey: process.env.OPENAI_API_KEY,
}).bindTools(tools);

const toolNodeForGraph = new ToolNode(tools);

// Define conditions for continuing the conversation flow
const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
      return "tools";
  }
  return END;
}

// Define function to call the model
const callModel = async (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const response = await modelWithTools.invoke(messages);
    console.log(response);
    return { messages: response };
}

// Define workflow
const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNodeForGraph)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent");

const app = workflow.compile();

// Handle POST request to process message
export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body.message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Run the graph with the input message
        const result = await app.invoke({
            messages: [
                {
                    role: "user",
                    content: body.message
                }
            ]
        });
        const lastMessage = result.messages[result.messages.length - 1];

        return NextResponse.json({ response: lastMessage.content });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to process message' },
            { status: 500 }
        );
    }
}
