type ModuleDescriptor = {
  rpcHandle: string;
  methods: MethodDescriptor[];
};

type MethodDescriptor = { name: string };

// declare function loadModule(moduleName: string): PromiseLike<ModuleDescriptor>;
// declare function callRpc(
//   moduleHandle: string,
//   methodName: string,
//   args: ArrayLike<any>
// ): PromiseLike<any>;
// declare function onStart(cb: Function);

type Module = {
  name: string;
  dclamd: 1 | 2;
  parent: string | null;
  dependants: Set<string>;
  dependencies: Array<string>;
  handlers: ModuleLoadedHandler[];
  exports: any;
};

type ModuleLoadedHandler = (module: Module) => void;

declare var self: any;

global = (typeof global !== "undefined"
  ? global
  : typeof self !== "undefined"
  ? self
  : typeof this !== "undefined"
  ? this
  : null) as any;

if (!global) throw new Error("unknown global context");

namespace loader {
  "use strict";

  const MODULE_LOADING = 1;
  const MODULE_READY = 2;

  const settings = {
    baseUrl: "",
  };

  let unnamedModules = 0;

  const registeredModules: Record<string, Module> = {};

  export function config(config: Record<string, any>) {
    if (typeof config === "object") {
      for (let x in config) {
        if (config.hasOwnProperty(x)) {
          (settings as any)[x] = config[x];
        }
      }
    }
  }

  export function define(factory: Function): void;
  export function define(id: string, factory: Function): void;
  export function define(
    id: string,
    dependencies: string[],
    factory: Function
  ): void;
  export function define(
    first: string | Function,
    second?: string[] | string | Function,
    third?: Function | object
  ): void {
    let moduleToLoad: string | null = null;
    let factory: Function | object = {};
    let dependencies: string[] | null = null;

    if (typeof first === "function") {
      factory = first;
    } else if (typeof first === "string") {
      moduleToLoad = first;

      if (typeof second === "function") {
        factory = second;
      } else if (second instanceof Array) {
        dependencies = second;
        factory = third!;
      }
    }

    dependencies = dependencies || ["require", "exports", "module"];

    if (moduleToLoad === null) {
      moduleToLoad = `unnamed-module-${unnamedModules++}`;
    }

    function ready(...deps: any[]) {
      const module = registeredModules[moduleToLoad!];

      if (!module)
        throw new Error("Could not access registered module " + moduleToLoad);

      let exports = module.exports;

      exports =
        typeof factory === "function"
          ? factory.apply(global, deps) || exports
          : factory;

      module.exports = exports;

      moduleReady(moduleToLoad!);
    }

    if (!registeredModules[moduleToLoad!]) {
      registeredModules[moduleToLoad!] = {
        name: moduleToLoad!,
        parent: null,
        dclamd: MODULE_LOADING,
        dependencies,
        handlers: [],
        exports: {},
        dependants: new Set(),
      };
    }

    require(dependencies || [], ready, moduleToLoad!);
  }

  function moduleReady(moduleName: string) {
    const module = registeredModules[moduleName];

    if (!module)
      throw new Error("Could not access registered module " + moduleName);

    module.dclamd = MODULE_READY;

    let handlers: ModuleLoadedHandler[] = module.handlers;

    if (handlers && handlers.length) {
      for (let x = 0; x < handlers.length; x++) {
        handlers[x](registeredModules[moduleName]);
      }
    }
  }

  export namespace define {
    export const amd = {};
  }

  export function require(
    dependencies: string | string[],
    callback: Function,
    parentModule: string
  ) {
    let dependenciesResults: any[] = new Array(dependencies.length).fill(null);
    let loadedCount = 0;
    let hasLoaded = false;

    if (typeof dependencies === "string") {
      if (registeredModules[dependencies]) {
        if (registeredModules[dependencies].dclamd === MODULE_LOADING) {
          throw new Error(
            `Trying to load ${dependencies} from ${parentModule}. The first module is still loading.`
          );
        }
        return registeredModules[dependencies];
      }
      throw new Error(
        dependencies +
          " has not been defined. Please include it as a dependency in " +
          parentModule +
          "'s define()"
      );
    }

    const depsLength = dependencies.length;

    for (let index = 0; index < depsLength; index++) {
      switch (dependencies[index]) {
        case "require":
          let _require: typeof require = function (
            new_module: string | string[],
            callback: Function
          ) {
            return require(new_module, callback, parentModule);
          } as any;
          _require.toUrl = function (module) {
            return toUrl(module, parentModule);
          };
          dependenciesResults[index] = _require;
          loadedCount++;
          break;
        case "exports":
          if (!registeredModules[parentModule]) {
            throw new Error(
              "Parent module " + parentModule + " not registered yet"
            );
          }

          dependenciesResults[index] = registeredModules[parentModule].exports;
          loadedCount++;
          break;
        case "module":
          dependenciesResults[index] = {
            id: parentModule,
            uri: toUrl(parentModule),
          };
          loadedCount++;
          break;
        default:
          load(
            dependencies[index],
            (loadedModule) => {
              dependenciesResults[index] = loadedModule.exports;
              loadedCount++;
              if (loadedCount === depsLength && callback) {
                hasLoaded = true;
                callback.apply(null, dependenciesResults);
              }
            },
            parentModule
          );
      }
    }

    if (!hasLoaded && loadedCount === depsLength && callback) {
      callback.apply(null, dependenciesResults);
    }
  }

  function createMethodHandler(rpcHandle: string, method: MethodDescriptor) {
    return function () {
      return (global as any).callRpc(
        rpcHandle,
        method.name,
        [].slice.call(arguments, 0)
      );
    };
  }

  function load(
    moduleName: string,
    callback: ModuleLoadedHandler,
    parentModule: string
  ) {
    moduleName = parentModule ? toUrl(moduleName, parentModule) : moduleName;

    if (registeredModules[moduleName]) {
      registeredModules[moduleName].dependants.add(parentModule);

      if (registeredModules[moduleName].dclamd === MODULE_LOADING) {
        callback && registeredModules[moduleName].handlers.push(callback);
      } else {
        callback && callback(registeredModules[moduleName]);
      }

      return;
    } else {
      registeredModules[moduleName] = {
        name: moduleName,
        parent: parentModule,
        dclamd: MODULE_LOADING,
        handlers: [callback],
        dependencies: [],
        dependants: new Set([parentModule]),
        exports: {},
      };
    }

    if (moduleName.indexOf("@") === 0) {
      let exports = registeredModules[moduleName].exports;
      (global as any)
        .loadModule(moduleName, exports)
        .then((descriptor: ModuleDescriptor) => {
          for (let i in descriptor.methods) {
            const method = descriptor.methods[i];
            exports[method.name] = createMethodHandler(
              descriptor.rpcHandle,
              method
            );
          }

          moduleReady(moduleName);
        })
        .catch((e: any) => {
          moduleReady(moduleName);
          throw e;
        });
    }
  }

  if (typeof (global as any).onStart !== "undefined") {
    (global as any).onStart(() => {
      const unknownModules = new Set<string>();
      const notLoadedModules: Module[] = [];

      for (let i in registeredModules) {
        if (registeredModules[i]) {
          if (registeredModules[i].dclamd === MODULE_LOADING) {
            notLoadedModules.push(registeredModules[i]);
          }

          registeredModules[i].dependencies.forEach(($) => {
            if ($ == "require" || $ == "exports" || $ == "module") return;
            if (!registeredModules[$]) unknownModules.add($);
          });
        }
      }

      const errorParts: string[] = [];

      if (unknownModules.size) {
        errorParts.push(
          `\n- Undeclared/unknown modules: ${Array.from(unknownModules).join(
            ", "
          )}`
        );
      }

      if (notLoadedModules.length) {
        errorParts.push(
          `\n- These modules didn't load: ${notLoadedModules
            .map(($) => $.name)
            .join(", ")}. Please check circular dependencies.`
        );
      }

      if (errorParts.length) {
        throw new Error(errorParts.join("\n"));
      }
    });
  }

  function toUrl(id: string, context?: string) {
    let changed = false;
    switch (id) {
      case "require":
      case "exports":
      case "module":
        return id;
    }
    const newContext = (context || settings.baseUrl).split("/");
    newContext.pop();
    const idParts = id.split("/");
    let i = idParts.length;
    while (--i) {
      switch (id[0]) {
        case "..":
          newContext.pop();
        case ".":
        case "":
          idParts.shift();
          changed = true;
      }
    }
    return (
      (newContext.length && changed ? newContext.join("/") + "/" : "") +
      idParts.join("/")
    );
  }

  require.toUrl = toUrl;
}

(global as any).define = loader.define;
(global as any).dclamd = loader;
