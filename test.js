const graphqlQueryGen = require('./index');

try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
    graphqlQueryGen.generateQueries(
        "https://rickandmortyapi.com/graphql",
        {
            depth: 5,
            indentBy: 2
        }
    ).then(
        result => console.log(result)
    );
} catch (err) {
    console.log(err.message);
}
