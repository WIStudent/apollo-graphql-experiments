import {ApolloClient, gql, HttpLink} from '@apollo/client/core';
import {InMemoryCache, NormalizedCacheObject, Reference, ApolloCache} from '@apollo/client/cache';
import {entries as Entries, entriesVariables as EntriesVariables} from './gql/__gen_gql/entries';
import {readFileSync} from 'fs';
import {resolve} from 'path';
import fetch from 'node-fetch';
import { removeEntryVariables as RemoveEntryVariables, removeEntry as RemoveEntry } from './gql/__gen_gql/removeEntry';
import { removeEntryFailedVariables as RemoveEntryFailedVariables, removeEntryFailed as RemoveEntryFailed } from './gql/__gen_gql/removeEntryFailed';
import {inspect} from 'util';
import chalk from 'chalk'

inspect.defaultOptions.depth = null;

const uri = 'http://localhost:4000/';

const entriesQuery = gql(readFileSync(resolve(__dirname, 'gql/entries.gql'), 'utf-8'))
const removeEntryMutation = gql(readFileSync(resolve(__dirname, 'gql/removeEntry.gql'), 'utf-8'))
const removeEntryFailedMutation = gql(readFileSync(resolve(__dirname, 'gql/removeEntryFailed.gql'), 'utf-8'))

async function queryEntries (variables: EntriesVariables, client: ApolloClient<NormalizedCacheObject>): Promise<void> {
  client.query<Entries, EntriesVariables>({
    query: entriesQuery,
    variables,
    fetchPolicy: 'network-only'
  });
}

async function queryEntriesFromCache (variables: EntriesVariables, client: ApolloClient<NormalizedCacheObject>): Promise<void> {
  const {data} = await client.query<Entries, EntriesVariables>({
    query: entriesQuery,
    variables,
    fetchPolicy: 'cache-only'
  });
  console.log('');
  console.log('variables:')
  console.log(variables)
  console.log('data:')
  console.log(data)
}

function watchQueryEntries (variables: EntriesVariables, client: ApolloClient<NormalizedCacheObject>): void {
  client.watchQuery<Entries, EntriesVariables>({
    query: entriesQuery,
    variables,
    fetchPolicy: 'cache-only'
  }).subscribe({
    next({data}) {
      console.log('');
      console.log(chalk.magenta('entries watchQuery'));
      console.log('variables:')
      console.log(variables)
      console.log('data:')
      console.log(data)
    }
  });
}

async function removeEntryFailed (variables: RemoveEntryFailedVariables, client: ApolloClient<NormalizedCacheObject>): Promise<void> {
  await client.mutate<RemoveEntryFailed, RemoveEntryFailedVariables>({
    mutation: removeEntryFailedMutation,
    variables,
    optimisticResponse: {
      removeEntryFailed: variables.id
    },
    update (cache) {
      cache.modify({
        fields: {
          entries(value: Reference[], {readField}) {
            return value.filter(entry => readField('id', entry) !== variables.id)
          }
        }
      });
      cache.gc();
    }
  })
}

async function removeEntry (variables: RemoveEntryVariables, client: ApolloClient<NormalizedCacheObject>): Promise<void> {
  await client.mutate<RemoveEntry, RemoveEntryVariables>({
    mutation: removeEntryMutation,
    variables,
    optimisticResponse: {
      removeEntry: variables.id
    },
    update (cache) {
      cache.modify({
        fields: {
          entries(value: Reference[], {readField}) {
            return value.filter(entry => readField('id', entry) !== variables.id)
          },
        }
        
      });
      cache.gc();
    }
  })
}

function removeCachedEntriesQueries (client: ApolloClient<NormalizedCacheObject>): void {
  client.cache.modify({
    fields: {
      entries() {
        return undefined;
      }
    }
  });
  client.cache.gc();
}

async function wait (ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function logCache (cache: ApolloCache<NormalizedCacheObject>) {
  console.log('');
  console.log(chalk.yellow('Cache:'));
  // @ts-ignore
  console.log(cache.data.data);
}

async function main(): Promise<void> {
  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          entries: {
            keyArgs: ["search"]
          }
        }
      }
    }
  })
  const client = new ApolloClient({
    cache,
    link: new HttpLink({
      uri,
      fetch: fetch as unknown as WindowOrWorkerGlobalScope['fetch']
    })

  });

  console.log(chalk.blue('query entries from cache'));
  await queryEntriesFromCache({search: '1'}, client);

  console.log(chalk.blue('Setup watchQueries'));
  // Setup cache-only watchQueries
  watchQueryEntries({search: '1'}, client);
  await wait(2000);
  watchQueryEntries({search: '2'}, client);
  await wait(2000);
  logCache(client.cache);

  // Trigger network-only entries queries
  console.log(chalk.blue('\nTrigger queries'));
  await queryEntries({search: '1'}, client);
  await wait(2000);
  await queryEntries({search: '2'}, client);
  await wait(2000);
  logCache(client.cache);

  console.log(chalk.blue('\nremoveEntry'));
  await removeEntry({id: '1'}, client);
  logCache(client.cache);
  await wait(2000);

  console.log(chalk.blue('\nremoveEntryFailed'));
  await removeEntryFailed({id: '2'}, client).catch(() => {});
  logCache(client.cache);
  await wait(2000);

  console.log(chalk.blue('\nremoveCachedEntriesQueries'))
  removeCachedEntriesQueries(client);
  logCache(client.cache);
}

main();