const graphqlQueryGen = require('./index');

const options = {
    depth: 5,
    indentBy: 2,
    filter: null,
    inputVariables: false
};

// Process using endpoint
try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
    
    graphqlQueryGen.processEndpoint(
        "https://www.universe.com/graphql", options
        
    ).then(
        result => console.log(JSON.stringify(result.sdl))
    );
} catch (err) {
    console.log(err.message);
}

// Process using schema
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
console.log(result);
