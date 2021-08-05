import {ApolloServer, gql} from 'apollo-server';
import {ApolloServerPlugin} from 'apollo-server-plugin-base'
import {readFileSync} from 'fs'
import {resolve} from 'path'

async function main() {
  const schemaPath = resolve(__dirname, 'schema.graphql');

  const typeDefs = gql(readFileSync(schemaPath, 'utf-8'));

  const entries = [
    {id: '1'},
    {id: '2'},
    {id: '3'}
  ];
  
  const resolvers = {
    Query: {
      entries: () => entries
    },
    Mutation: {
      removeEntry: (_: unknown, {id}: {id: string}) => id,
      removeEntryFailed: () => {
        throw Error();
      }
    }
  };

  const logPlugin: ApolloServerPlugin = {
    async requestDidStart(requestContext): Promise<void> {
      console.log(`Request started! Query:\n${requestContext.request.operationName}\nVariables\n${JSON.stringify(requestContext.request.variables)}\n`);
    }
  };
  
  const server = new ApolloServer({typeDefs, resolvers, plugins: [logPlugin]});
  const {url} = await server.listen()
  console.log(`Server is ready at ${url}`)
}

main();