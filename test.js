const graphqlQueryGen = require('./index');

const options = {
  debug: false,
  responseDepth: 5,
  inputDepth: 7,
  indentBy: 2,
  spacer: ' ',
  filter: null,
  inputVariables: true,
  duplicatePercentage: 75
};

// Process using endpoint
try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

    graphqlQueryGen.processEndpoint(
        "https://rickandmortyapi.com/graphql", options

    ).then(
        result => console.log(result)
    ).catch(
      error => console.log(error.message)
    )
} catch (err) {
    console.log(err.message);
}

// Process using schema
const s = `
type Character {
  id: ID
  name: [String]!
}
type Jedi  {
  id: ID
  side: String!
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

input TestInput {
    key1: String
    key2: [Int!]!
    key3: Float!
    key4: Char
}
union People = Character | Jedi | Droid
type Query {
  allPeople(input: TestInput!, input2: [String]!): [People]
  testScalar(a: String): JSON
}

scalar JSON
`;
try {
  const result  = graphqlQueryGen.processSchema(s, options);
  console.log(result);
} catch (err) {
  console.log('Error: ' + err.message);
}

// Process using SDL
const fs = require('fs');
let rawdata = fs.readFileSync('sdl.json');
const sdl = JSON.parse(rawdata);
try {
  const result = graphqlQueryGen.processSDL(sdl.data, options);
  console.log(result.schema, { 'maxArrayLength': null });
} catch (err) {
  console.log('Error: ' + err.message);
}
