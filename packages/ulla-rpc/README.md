# `ulla-rpc`

## Scripting

Scripts are pieces of logic that run inside the context of a Web Worker or remotely in a server.

## Transports

The scripts communicate with the host application thru a JSON-RPC2 based protocol using a defined transport. We have 3 built in transports.

- [WebWorker](src/common/transports/WebWorker.ts): Used to load a sandboxed script locally, inside a WebWorker
- [WebSocket](src/common/transports/WebSocket.ts): Used to run scripts in remote servers
- [Memory](src/common/transports/Memory.ts): Used to run tests, mainly. The script runs in the same execution context as the host.

## Scripting host

The [ScriptingHost](src/host/ScriptingHost.ts) is a core piece that instanciates APIs and handles incoming/outgoing messages from the scripts.

## APIs

APIs work as a bridge between user-created scripts and the lower level APIs of the client (communication, 3D entity management, etc). It provides a set of exposed methods that can be accessed from the script context. These methods are `async` by default and Promises are used as hooks for events that may be triggered in the future (HTTP Responses, entity collisions, etc).

The `@exposeMethod` decorator is provided as means of exposing API methods to the Script.

An example implementation can be found at [3.Class.spec.ts](test/scenarios/3.Class.spec.ts)

### See also

1.  [APIs introduction](docs/apis/introduction.md)
2.  [Common patterns](docs/apis/common-patterns.md)
3.  [Scripting host](docs/apis/scripting-host.md)

## Scripts

The term "script" or sometimes "system" refers to the instance of a user-created script, normally running inside a Web Worker. To access an API instance the decorator `@inject(apiName: string)` function is used. From then on, the user will be able to call all exposed methods and `await` the promises returned by them.

An example implementation can be found at [7.0.MethodsInjection.ts](test/fixtures/7.0.MethodsInjection.ts)

### See also

1.  [Scripts introduction](docs/scripts/introduction.md)
2.  [Common patterns](docs/scripts/common-patterns.md)

# Related documents

[The Entity-Component-System - An awesome gamedesign pattern in C Part 1](https://www.gamasutra.com/blogs/TobiasStein/20171122/310172/The_EntityComponentSystem__An_awesome_gamedesign_pattern_in_C_Part_1.php)

Why do we create a component based system? [Components](http://gameprogrammingpatterns.com/component.html)