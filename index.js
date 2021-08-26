const fetch = require('node-fetch');
const faker = require('faker');

exports.generateQueries = async function(url, options) {
    // Merge user options with defaults
    const defaults = {
        filter: null,
        depth: 5,
        spacer: ' ',
        indentBy: 4
    }
    options = Object.assign({}, defaults, options);

    //Prepare to fetch sdl
    var myHeaders = new fetch.Headers();
    myHeaders.append("Content-Type", "application/json");
    var data = {"query":"\n    query IntrospectionQuery {\n      __schema {\n        \n        queryType { name }\n        mutationType { name }\n        subscriptionType { name }\n        types {\n          ...FullType\n        }\n        directives {\n          name\n          description\n          \n          locations\n          args {\n            ...InputValue\n          }\n        }\n      }\n    }\n\n    fragment FullType on __Type {\n      kind\n      name\n      description\n      \n      fields(includeDeprecated: true) {\n        name\n        description\n        args {\n          ...InputValue\n        }\n        type {\n          ...TypeRef\n        }\n        isDeprecated\n        deprecationReason\n      }\n      inputFields {\n        ...InputValue\n      }\n      interfaces {\n        ...TypeRef\n      }\n      enumValues(includeDeprecated: true) {\n        name\n        description\n        isDeprecated\n        deprecationReason\n      }\n      possibleTypes {\n        ...TypeRef\n      }\n    }\n\n    fragment InputValue on __InputValue {\n      name\n      description\n      type { ...TypeRef }\n      defaultValue\n    }\n\n    fragment TypeRef on __Type {\n      kind\n      name\n      ofType {\n        kind\n        name\n        ofType {\n          kind\n          name\n          ofType {\n            kind\n            name\n            ofType {\n              kind\n              name\n              ofType {\n                kind\n                name\n                ofType {\n                  kind\n                  name\n                  ofType {\n                    kind\n                    name\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  ","operationName":"IntrospectionQuery"};
    var requestOptions = { method: 'POST', headers: myHeaders, body: JSON.stringify(data), redirect: 'follow' };
    
    //Fetch SDL
    const response = await fetch(url, requestOptions)
    const json = await response.json();

    //Process SDL
    var queries = listOperations(json.data.__schema.types, 'Query', options.filter, options.depth, options.spacer, options.indentBy);
    var mutations = listOperations(json.data.__schema.types, 'Mutation', options.filter, options.depth, options.spacer, options.indentBy);
    return {
        operations : [
            {name: 'Query', options: queries},
            {name: 'Mutation', options: mutations},
            {name: 'Subscription', options: []}
        ],
        statistics: {}
    };
}
	
function listOperations(types, typeName, filter, depth, spacer, indentBy) {
    console.log(`Preparing for operation type ${typeName}`);
    var ops = [];
    const opType = types.filter(type => type.name == typeName)[0];
    if(opType)
        opType.fields.filter(field => filter ? field.name.includes(filter): field).forEach(field => {
            const op = {
                name: field.name, 
                operation : generateOperation(types, typeName, field.name, field.args, field.type, depth, spacer, indentBy)
            };
            ops.push(op);
        });
    return ops;
}

function generateOperation(types, typeName, opName, args, resType, depth, spacer, indentBy) {
    // console.log(`Generating operations`);
    const input = generateArgsInput(types, args, indentBy *2, spacer, indentBy);
    const resFields = generateResponseFields(types, resType, indentBy* 2, depth, spacer, indentBy);
    return `${typeName.toLowerCase()} {
${spacer.repeat(indentBy)}${opName} ${input} {
${spacer.repeat(indentBy * 2)}__typename
${resFields}
${spacer.repeat(2)}}
}`;
}

function generateArgsInput(types, args, indent, spacer, indentBy) {
    // console.log(`Generating args input`);
    if (args.length == 0) return '';
    
    const inputs = [];  
    args.forEach(arg => {
        inputs.push(generateArg(types, arg, indent, spacer, indentBy));
    });
    return `(
${inputs.join(',\n')}
${spacer.repeat(indent - indentBy)})`;
}

function generateArg(types, arg, indent, spacer, indentBy) {
    return `${spacer.repeat(indent)}${arg.name}: ${getArgValue(types, arg, indent, spacer, indentBy)}`;
}

function getArgValue(types, arg, indent, spacer, indentBy) {
    const kind = arg.kind;
    const argType = getType(arg.type);

    if(kind == 'LIST')
        return  `[` + generateArgValue(types, argType, indent, spacer, indentBy) + `]`;
    else
        return generateArgValue(types, argType, indent, spacer, indentBy);
}

function generateArgValue(types, argType, indent, spacer, indentBy) {
    if (argType.kind == 'SCALAR')
        return getRandomValue(argType.name);
    else if (argType.kind == 'ENUM') {
        const inputTypeDef = types.filter(type => type.name == argType.name && type.kind == 'ENUM')[0];
        return inputTypeDef.enumValues[0].name;
    } else if (argType.kind == 'INPUT_OBJECT') {
        var values = []
        const inputTypeDef = types.filter(type => type.name == argType.name && type.kind == 'INPUT_OBJECT')[0];
        
        inputTypeDef.inputFields.forEach(f => {
            values.push(generateArg(types, f, indent + indentBy, spacer, indentBy));
        });
        return ` {
${values.join(',\n')}
${spacer.repeat(indent)}}`;
    }
}

function getName(responseType) {
    if(!responseType.name)
        return getName(responseType.ofType)
    return responseType.name
}

function getType(fieldType) {
    if(!fieldType.name)
        return getType(fieldType.ofType)
    return fieldType;
}

function responseFieldsUnion(types, typeDef, indent, depth, spacer, indentBy) {
    var fields = [];
    typeDef.possibleTypes.forEach(pt => {
        const f = `${spacer.repeat(indent)}... on ${pt.name} {
${generateResponseFields(types, pt, indent + indentBy, depth, spacer, indentBy)}
${spacer.repeat(indent)}}`;
        fields.push(f);
    });
    return fields.join('\n');
}

function responseField(types, f, indent, depth, spacer, indentBy) {
    const fieldType = getType(f.type);
    if (fieldType.kind == 'OBJECT') {
        var nestedField = generateResponseFields(types, fieldType, indent + indentBy, depth -1, spacer, indentBy);
        if (nestedField == "")
            return null;    
        else
            return `${f.name} { 
${nestedField}
${spacer.repeat(indent)}}`; 
    } else
        return f.name;
}

function generateResponseFields(types, responseType, indent, depth, spacer, indentBy) {
    // console.log(`Generating response fields`);
    if (depth <=0)
        return "";
    const responseTypeDef = types.filter(type => type.name == getName(responseType))[0];
    const fields = [];

    if(responseTypeDef.kind == 'UNION')
        return responseFieldsUnion(types, responseTypeDef, indent, depth, spacer, indentBy);
    
    if(responseTypeDef['fields']) {
        responseTypeDef.fields.forEach(f => {
            var field = responseField(types, f, indent, depth, spacer, indentBy);
            if (field)
                fields.push(field);
        });
    }
    return `${spacer.repeat(indent)}` + fields.join(`\n${spacer.repeat(indent)}`);
}

function getRandomValue(type) {
    switch(type){
        case 'Int':
            return faker.datatype.number();
        case 'Float':
            return faker.datatype.float();
        case 'String':
            return '"' + faker.datatype.string() + '"';
        case 'uuid':
            return '"' + faker.datatype.uuid() + '"';
        case 'Boolean':
            return faker.datatype.boolean();
        case 'Date':
            return  '"' + faker.date.past() + '"';
        case 'ID':
            return  '"' + faker.datatype.uuid() + '"';
        default:
            return "\"\"";
    }
}
