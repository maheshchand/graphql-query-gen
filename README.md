# graphql-query-gen
Node.js module to generate queries from graphQL endpoint. 

It reads graphql SDL using introspection query and then generates queries/mutations with random input data.

## Installation

> npm install graphql-query-gen

## Usage

```javascript

const qGen = require('graphql-query-gen');

const options = {};
qGen.generateQueries("endpoint-url", options).then(result => console.log(result));


// or you can do like to handle errors as well
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
    indentBy: 2 // Number [Default is 4] -> The number of spacer to use for indentation.
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
  statistics: {}
}

```

## TODO

Subscriptions are not parsed and resturned as of now, planned for next release
statistics is aways empty and planned to return details in next release
