const { getIntrospectionQuery, buildClientSchema , buildSchema, introspectionFromSchema, printSchema} = require('graphql');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
var stringSimilarity = require("string-similarity");

class HTTPResponseError extends Error {
	constructor(response, ...args) {
        super(`HTTP Error Response: ${response.status} ${response.statusText}`, ...args);
        this.response = response;
	}
}

exports.processEndpoint = async function(url, options) {
    //Prepare to fetch sdl
    var myHeaders = new fetch.Headers();
    myHeaders.append("Content-Type", "application/json");
    var data = {"query": getIntrospectionQuery()};
    var requestOptions = { method: 'POST', headers: myHeaders, body: JSON.stringify(data), redirect: 'follow' };
    
    //Fetch SDL
    const response = await fetch(url, requestOptions)

    if (!response || !response.ok) {
        throw new HTTPResponseError(response);
    }
    
    const json = await response.json();
    const schema = printSchema(buildClientSchema(json.data, {assumeValid: true}))
    return exports.process(json.data, schema, options);
}

exports.processSchema = function(schema, options) {
    const graphqlSchema = buildSchema(schema);
    const introspection = introspectionFromSchema(graphqlSchema);
    return exports.process(introspection, schema, options);
}

// TODO: Process fragments, subscriptions
// TODO: Logger
exports.process = function(sdl, schema, options) {
    // Merge user options with defaults
    const defaults = {
        filter: null,
        depth: 5,
        spacer: ' ',
        indentBy: 4,
        inputVariables: false,
        duplicatePercentage: 75
    }
    options = Object.assign({}, defaults, options);

    //Process SDL
    var queries = listOperations(sdl.__schema.types, 'Query', options.filter, options.depth, options.spacer, options.indentBy, options.inputVariables);
    var mutations = listOperations(sdl.__schema.types, 'Mutation', options.filter, options.depth, options.spacer, options.indentBy, options.inputVariables);
    var subscriptions = [];
    var types = listTypes(sdl.__schema.types, 'OBJECT', options.spacer, options.indentBy);
    var inputs = listInputs(sdl.__schema.types, 'INPUT_OBJECT', options.spacer, options.indentBy);
    var duplicates = listDuplicates(types, inputs, options.duplicatePercentage);
    return {
        operations : [
            {name: 'Query', options: queries},
            {name: 'Mutation', options: mutations},
            {name: 'Subscription', options: subscriptions}
        ],
        types: types,
        inputs: inputs,
        statistics: {
            counts: {
                queries: queries.length,
                mutations: mutations.length,
                subscriptions: subscriptions.length,
                types: types.length,
                inputs: inputs.length
            },
            suggestions: {
                duplicates: duplicates
            }
        },
        schema: schema
    };
}

function listDuplicates(types, inputs, duplicatePercentage) {
    var duplicates = findDuplicates(types, 'Type', duplicatePercentage);
    duplicates = duplicates.concat(findDuplicates(inputs, 'Input', duplicatePercentage));
    return duplicates;
}

function findDuplicates(list, prefix, duplicatePercentage) {
    const duplicates = [];
    for(var i =0; i< list.length; i++) {
        for(var j = i+1 ; j< list.length; j++) {
            const similarity = stringSimilarity.compareTwoStrings(list[i].definition, list[j].definition);
            const similarityPercentage = (similarity*100).toFixed(2);
            if(similarityPercentage >= duplicatePercentage)
                duplicates.push(`${prefix} ${list[i].name} is ${similarityPercentage}% similar to ${list[j].name}`);
        }
    }
    return duplicates;
}

function listTypes(types, kind, spacer, indent) {
    const excludeList = ['Query', 'Mutation', 'Subscription'];
    const resultTypes = types.filter(type => type.kind == kind && !type.name.startsWith('__') && excludeList.indexOf(type.name) == -1);
    const results = [];
    resultTypes.forEach(t => {
        const fields = [];
        t.fields.forEach(f => {
            fields.push(`${f.name}: ${generateTypeValue(f.type)}`);
        });
        results.push({ name: t.name, definition: `{\n${spacer.repeat(indent)}${fields.join('\n' + spacer.repeat(indent))}\n}`});
    });
    return results;
}

function listInputs(types, kind, spacer, indent) {
    const inputTypes = types.filter(type => type.kind == kind);
    const inputs = [];
    inputTypes.forEach(t => {
        const inputFields = [];
        t.inputFields.forEach(f => {
            inputFields.push(`${f.name}: ${generateTypeValue(f.type)}`);
        });
        inputs.push({ name: t.name, definition: `{\n${spacer.repeat(indent)}${inputFields.join('\n' + spacer.repeat(indent))}\n}`});
    });
    return inputs;
}
	
function listOperations(types, typeName, filter, depth, spacer, indentBy, inputVariables) {
    console.log(`Preparing for operation type ${typeName}`);
    var ops = [];
    const opType = types.filter(type => type.name == typeName)[0];
    if(opType)
        opType.fields.filter(field => filter ? field.name.includes(filter): field).forEach(field => {
            const op = generateOperation(types, typeName, field.name, field.args, field.type, depth, spacer, indentBy, inputVariables);
            ops.push(op);
        });
    return ops;
}

function generateOperation(types, typeName, opName, args, resType, depth, spacer, indentBy, inputVariables) {
    // console.log(`Generating operations`);
    const argsInput = generateArgsInput(types, args, indentBy *2, spacer, indentBy, inputVariables);
    const resFields = generateResponseFields(types, resType, indentBy* 2, depth, spacer, indentBy);
    
    var resDef = '';
    if(resFields)
        resDef = ` {
${spacer.repeat(indentBy * 2)}__typename
${resFields}
${spacer.repeat(2)}}`;

    const query = `${typeName.toLowerCase()}${argsInput.typeVars} {
${spacer.repeat(indentBy)}${opName} ${argsInput.input}${resDef}
}`;

    return {
        name: opName, 
        query : query,
        variables: argsInput.variables
    };
}

function generateArgsInput(types, args, indent, spacer, indentBy, inputVariables) {
    var argsInput  = {
        typeVars: '',
        input: '',
        variables : {}
    }
    // console.log(`Generating args input`);
    if (args.length > 0) {
        const inputs = [];
        const typeVars = [];
        args.forEach(arg => {
            if (inputVariables) {
                argsInput.variables[arg.name] = getArgValue(types, arg, indent, spacer, indentBy, inputVariables);
                typeVars.push(`$${arg.name}: ${generateTypeValue(arg.type)}`);
                inputs.push(`${arg.name}: $${arg.name}`);
            } else {
                inputs.push(generateArg(types, arg, indent, spacer, indentBy, inputVariables));
            }
        });

        argsInput.typeVars = inputVariables ? ' (' + typeVars.join(', ') + ')' : '';
        argsInput.input = `(
${spacer.repeat(indent)}${inputs.join(`,\n${spacer.repeat(indent)}`)}
${spacer.repeat(indent - indentBy)})`;
    } 

    return argsInput;
}

function generateArg(types, arg, indent, spacer, indentBy, inputVariables) {
    return `${spacer.repeat(indent)}${arg.name}: ${getArgValue(types, arg, indent, spacer, indentBy, inputVariables)}`;
}

function getArgValue(types, arg, indent, spacer, indentBy, inputVariables) {
    const kind = arg.kind;
    const argType = getType(arg.type);

    if(kind == 'LIST')
        if(inputVariables)
            return  [ generateArgValue(types, argType, indent, spacer, indentBy, inputVariables) ];
        else
            return  `[` + generateArgValue(types, argType, indent, spacer, indentBy, inputVariables) + `]`;
    else
        return generateArgValue(types, argType, indent, spacer, indentBy, inputVariables);
}

function generateArgValue(types, argType, indent, spacer, indentBy, inputVariables) {
    if (argType.kind == 'SCALAR')
        return getRandomValue(argType.name, inputVariables);
    else if (argType.kind == 'ENUM') {
        const inputTypeDef = types.filter(type => type.name == argType.name && type.kind == 'ENUM')[0];
        return inputTypeDef.enumValues[0].name;
    } else if (argType.kind == 'INPUT_OBJECT') {
        var values = []
        const inputTypeDef = types.filter(type => type.name == argType.name && type.kind == 'INPUT_OBJECT')[0];
        
        if(inputVariables) {
            var value = {};
            inputTypeDef.inputFields.forEach(f => {
                value[f.name] = getArgValue(types, f, indent + indentBy, spacer, indentBy, inputVariables)
            });
            return value;
        } else {
            inputTypeDef.inputFields.forEach(f => {
                values.push(generateArg(types, f, indent + indentBy, spacer, indentBy, inputVariables));
            });
            return ` {
${values.join(',\n')}
${spacer.repeat(indent)}}`;
        }
    }
}

function generateTypeValue(type) {
    const fieldType = getType(type);
    const fieldKind = getKind(type, []).reverse();
    var type = fieldType.name;
    fieldKind.forEach(k => {
        if(k == 'LIST')
            type = '[' + type + ']';
        else if (k  == 'NON_NULL')
            type = type + '!';
    });
    return type;
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

function getKind(fieldType, kinds) {
    if(fieldType.ofType != null){
        kinds.push(fieldType.kind);
        return getKind(fieldType.ofType, kinds);
    } else {
        return kinds;
    }
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

    if(responseTypeDef.kind == 'SCALAR')
        return null;

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

function getRandomValue(type, inputVariables) {
    switch(type){
        case 'Int':
            return Math.floor((Math.random() * 1000) + 1);
        case 'Float':
            return parseFloat(((Math.random() * 1000) + 1).toFixed(2));;
        case 'String':
            return inputVariables? getRandomString() : '"' + getRandomString() + '"';
        case 'uuid':
            return inputVariables? uuidv4() : '"' + uuidv4() + '"';
        case 'Boolean':
            return [true, false][Math.floor(Math.random() * 2)];
        case 'Date':
            return  inputVariables? new Date().toDateString() : '"' + new Date().toDateString() + '"';
        case 'ID':
            return  inputVariables? uuidv4() : '"' + uuidv4() + '"';
        default:
            return inputVariables? "" : "\"\"";
    }
}

function getRandomString() {
    return ['Suspendisse', 'quis', 'gravida', 'risus', 'eu', 'auctor', 'erat', 'Vivamus', 'libero', 'lorem',
        'elementum', 'pulvinar', 'lacinia', 'nec', 'accumsan'][Math.floor(Math.random() * 10)];
}
