# graphql-query-gen
Node.js module to generate queries from graphQL endpoint or from schema text. 

It reads graphql SDL using introspection query and then generates queries/mutations with random input data. Additionally lists down inputs, types as well. Also, there you get schema string and some statistics data as well.

## Installation

> npm install graphql-query-gen

## Live Demo

>  [Graphql Query Generator](https://chrome.google.com/webstore/search/jmdpimbhelkmbpgdkjgapkegfapaapej) is a chrome extension built using this. You can install and try it to see what this node module can do for you.

## Usage

```javascript

const qGen = require('graphql-query-gen');

const options = {};

// Work with endpoint
qGen.processEndpoint("endpoint-url", options).then(result => console.log(result));

// work with schema
const s = `
type Character {
  id: ID
  name: String
}
type Jedi  {
  id: ID
  side: String
}
type Droid {
  id: ID
  model: Model
}
type Model {
    key: String
}

input Char {
  id: ID
  name: [String]!
}

input Char2 {
  id: ID
  name: [String]!
}

input TestInput {
    key1: String
    key2: Int
    key3: Float!
    key4: Char
    key5: Gender
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

union People = Character | Jedi | Droid
type Query {
  """
  This is a comment for allPeople Query
  """
  allPeople(input: TestInput, input2: String): [People]
}
`;
const result  = graphqlQueryGen.processSchema(s, options);

// work with SDL
const fs = require('fs');
let rawdata = fs.readFileSync('sdl.json');
const sdl = JSON.parse(rawdata);
const result  = graphqlQueryGen.processSDL(sdl.data, options);


// or you can do like below to handle errors as well
const qGen = require('graphql-query-gen');
try {
    qGen.generateQueries(
        "http://graphql-endpoint-url/",
        {
            depth: 5,
            indentBy: 2
        }
    ).then(
        result => console.log(result)
        // or do what you want to do with it
    );
} catch (err) {
    console.log(err.message);
}

```

## Options

```javascript
{
    debug: false, // Boolean [Default is false] -> Would print additional log message to help in debugging if true
    filter: null, // String [Default is null ] -> You can give a query or mutation name or part of it
    responseDepth: 7, // Number [Default is 5] -> For query/mutation result the nesting level of fields
    inputDepth: 8, // Number [Default is 7] -> For query/muation input the nesting level of fields
    spacer: ' ', // String [Default is ''] -> To indent query/mutation the space character (e.g. to print on HTML page you can use &nbsp; )
    indentBy: 2, // Number [Default is 4] -> The number of spacer to use for indentation.
    inputVariables: true, // Boolean [Default is false] -> In generated query input would be in form or variable if true, else inline input.
    duplicatePercentage: 75, // Number [Default is 75] -> Uses this as threshold value while checking duplicates in types and inputs.
    headers: {}, // JSON Object [Default is {"Content-Type": "application/json"}] -> Pass custom header(s) to your GraphQL endpoint to allow Authorization, logging, sessionId etc.
    operationName: true, // Boolean [Default is true] -> Would add operation name in generated query/mutation if true.
    comments: true // Boolean [Default is true] -> Would include comments in generated query/mutation if comments available in schema and this flag is true.
}

```

## Output

Sample output looks like following

```javascript

{
    "operations": [
        {
            "name": "Query",
            "options": [
                {
                    "name": "allPeople",                    "query": "# This is a comment for allPeople Query\nquery allPeople ($input: TestInput!, $input2: [String]!) {\n  allPeople (\n    # First Input,\n    input: $input,\n    input2: $input2\n  ) {\n    __typename\n    ... on Character {\n      id\n      name\n      sex\n    }\n    ... on Jedi {\n      id\n      side\n    }\n    ... on Droid {\n      id\n      model { \n        key\n      }\n    }\n  }\n}",
                    "variables": {
                        "input": {
                            "key1": "erat",
                            "key2": [
                                228
                            ],
                            "key3": 640.55,
                            "key4": {
                                "id": "ca2bd78f-928d-4554-aaa9-b421174ab833",
                                "name": [
                                    "Vivamus"
                                ]
                            },
                            "key5": "MALE"
                        },
                        "input2": [
                            "quis"
                        ]
                    }
                },
                {
                    "name": "testScalar",
                    "query": "query testScalar ($a: String) {\n  testScalar (\n    a: $a\n  )\n}",
                    "variables": {
                        "a": "Vivamus"
                    }
                }
            ]
        },
        {
            "name": "Mutation",
            "options": []
        },
        {
            "name": "Subscription",
            "options": []
        }
    ],
    "types": [
        {
            "name": "Character",
            "definition": "type Character {\n  id: ID\n  name: [String]!\n  sex: Gender\n}"
        },
        {
            "name": "Jedi",
            "definition": "type Jedi {\n  id: ID\n  side: String!\n}"
        },
        {
            "name": "Droid",
            "definition": "type Droid {\n  id: ID\n  model: Model\n}"
        },
        {
            "name": "Model",
            "definition": "type Model {\n  key: String\n}"
        }
    ],
    "inputs": [
        {
            "name": "Char",
            "definition": "input Char {\n  id: ID\n  name: [String]!\n}"
        },
        {
            "name": "Char2",
            "definition": "input Char2 {\n  id: ID\n  name: [String]!\n}"
        },
        {
            "name": "TestInput",
            "definition": "input TestInput {\n  key1: String\n  key2: [Int!]!\n  key3: Float!\n  key4: Char\n  key5: Gender\n}"
        }
    ],
    "statistics": {
        "counts": {
            "queries": 2,
            "mutations": 0,
            "subscriptions": 0,
            "types": 4,
            "inputs": 3
        },
        "suggestions": {
            "duplicates": [
                "Input Char is 94.92% similar to Char2"
            ]
        }
    },
    "schema": "SCHEMA_AS_STRING"
}

```

## TODO

- Subscriptions are not processed and will resturn as empty as of now, planned for future release
- Fragments support is limited for now, plan to enhance in future release
- Better logging, current version has console.log and console.debug only
