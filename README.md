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

input TestInput {
    key1: String
    key2: Int
}
union People = Character | Jedi | Droid
type Query {
  allPeople(input: TestInput, input2: String): [People]
}
`;

const result  = graphqlQueryGen.processSchema(s, options);

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
    filter: null, // String [Default is null ] -> You can give a query or mutation name or part of it
    depth: 7, // Number [Default is 5] -> For query/mutation result the nesting level of fields
    spacer: ' ', // String [Default is ''] -> To indent query/mutation the space character (e.g. to print on HTML page you can use &nbsp; )
    indentBy: 2, // Number [Default is 4] -> The number of spacer to use for indentation.
    inputVariables: true // Boolean [Default is false] -> In generated query input would be in form or variable if true, else inline input.
}

```

## Output

Sample output looks like following

```javascript

{
  operations: [
    { name: 'Query', options: [Array] },
    { name: 'Mutation', options: [] },
    { name: 'Subscription', options: [] }
  ],
  types: [
    { name: 'Character', definition: '{\n  id: ID\n  name: String\n}' },
    { name: 'Jedi', definition: '{\n  id: ID\n  side: String\n}' },
    { name: 'Droid', definition: '{\n  id: ID\n  model: Model\n}' },
    { name: 'Model', definition: '{\n  key: String\n}' }
  ],
  inputs: [
    {
      name: 'TestInput',
      definition: '{\n  key1: String\n  key2: Int\n}'
    }
  ],
  statistics: {
    counts: { queries: 1, mutations: 0, subscriptions: 0, types: 4, inputs: 1 },
    suggestions: { duplicates: [Array] }
  },
  schema: 'SCHEMA_AS_STRING'
}

```

## TODO

- Subscriptions are not processed and will resturn as empty as of now, planned for future release
- Fragments support is limited for now, plan to enhance in future release
- No logger for now, plan to add in future release
