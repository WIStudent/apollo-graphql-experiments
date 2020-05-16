# client1
## Schema
```gql
type Entry {
  id: String!
}

type Query {
  entries (search: String!): [Entry!]!
}

type Mutation {
  removeEntry (id: String!): String!
  removeEntryFailed (id: String!): String!
}

```
## What is does
1. Setup cache-only watchQueries `entries(search: "1")` and `entries(search: "2")`.
2. Trigger network-only queries `entries(search: "1")` and `entries(search: "2")`.
3. Trigger optimistic mutation `removeEntry(id: "1")`. Its update function removes the entry from the previously queried entry lists.
4. Trigger optimistic mutation `removeEntryFailed(id: "2")`. Its update function removes the entry from the previously queried entry lists. `removeEntryFailed` will always fail on server-side.

## How to run
1. Start server from the server folder.
2. ```
   $ npm run gen-types
   $ npx ts-node index.ts
   ```