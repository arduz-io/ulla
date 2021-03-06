const expect = require("expect");

describe("simple test with external module", () => {
  const starters = [];
  it("defines global.*", () => {
    global.loadModule = function(moduleName) {
      if (moduleName == "@dcl/test")
        return Promise.resolve({
          rpcHandle: "123",
          methods: [
            {
              name: "xxx"
            },
            {
              name: "zzz"
            }
          ]
        });
      throw new Error("Unknown module " + moduleName);
    };

    global.callRpc = function(moduleHandle, methodName, args) {
      if (moduleHandle !== "123") {
        throw new Error("Unknown module handle " + moduleHandle);
      }

      if (methodName === "xxx") {
        return Promise.resolve(args.reduce((a, b) => a + b, 0));
      }

      return Promise.reject(new Error("Unknown method"));
    };

    global.onStart = function(cb) {
      starters.push(cb);
    };

    var name = require.resolve("../dist/amd");
    delete require.cache[name];
    require(name);
  });

  it("defines a module that loads other module that loads @dcl/test", done => {
    global.define("test", ["a"], a => {
      try {
        expect(a.exportedTestDCL).toHaveProperty("xxx");
        expect(a.exportedTestDCL).toHaveProperty("zzz");
      } catch (e) {
        done(e);
        return;
      }

      a.exportedTestDCL
        .xxx(1, 2, 3, 4)
        .then(r => {
          expect(r).toEqual(10);

          a.exportedTestDCL
            .zzz()
            .then(r => {
              done("didnt fail");
            })
            .catch(() => done());
        })
        .catch(done);
    });

    define("a", ["exports", "@dcl/test"], (exports, testDCL) => {
      exports.exportedTestDCL = testDCL;
    });
  });

  it("starters must not throw", () => {
    expect(starters.length).toBeGreaterThan(0);
    starters.forEach($ => $());
  });
});

describe("simple test with external module that doesnt exist and throw", () => {
  const starters = [];
  it("defines global.*", () => {
    global.loadModule = function loadModule(moduleName) {
      if (moduleName == "@throw/test")
        return Promise.resolve({
          rpcHandle: "123",
          methods: [
            {
              name: "xxx"
            },
            {
              name: "zzz"
            }
          ]
        });
      throw new Error("Unknown module " + moduleName);
    };

    global.callRpc = function(moduleHandle, methodName, args) {
      if (moduleHandle !== "123") {
        throw new Error("Unknown module handle " + moduleHandle);
      }

      if (methodName === "xxx") {
        return Promise.resolve(args.reduce((a, b) => a + b, 0));
      }

      return Promise.reject(new Error("Unknown method"));
    };

    global.onStart = function(cb) {
      starters.push(cb);
    };

    var name = require.resolve("../dist/amd");
    delete require.cache[name];
    require(name);
  });

  it("defines a module that loads other module that loads @throw/test", done => {
    global.define("test", ["a"], a => {
      try {
        expect(a.exportedTestDCL).toHaveProperty("xxx");
        expect(a.exportedTestDCL).toHaveProperty("zzz");
      } catch (e) {
        done(e);
        return;
      }

      a.exportedTestDCL
        .xxx(1, 2, 3, 4)
        .then(r => {
          expect(r).toEqual(10);

          a.exportedTestDCL
            .zzz()
            .then(r => {
              done("didnt fail");
            })
            .catch(() => done());
        })
        .catch(done);
    });

    expect(() =>
      define("a", ["exports", "@throw/test", "@throw/test2", "@throw/tes3"], (
        exports,
        testDCL
      ) => {
        exports.exportedTestDCL = testDCL;
      })
    ).toThrow();

    done();
  });

  it("starters must throw", () => {
    expect(starters.length).toBeGreaterThan(0);
    expect(() => starters.forEach($ => $())).toThrow();
  });
});

describe("test cycles", () => {
  const starters = [];
  it("defines global.*", () => {
    global.onStart = function(cb) {
      starters.push(cb);
    };

    var name = require.resolve("../dist/amd");
    delete require.cache[name];
    require(name);
  });

  it("define cycles", () => {
    global.define("systemA", ["exports", "systems"], (exports, systems) => {
      exports.systemA = "systemA";
    });
    global.define("systemB", ["exports", "systems"], (exports, systems) => {
      exports.systemB = "systemB";
    });
    global.define(
      "systems",
      ["exports", "systemA", "systemB"],
      (exports, systemA, systemB) => {
        exports.systems = { systemA, systemB };
      }
    );

    global.define(["systems"], systems => {
        expect(systems.systemA).toEqual("systemA");
        expect(systems.systemB).toEqual("systemB");
    });
  });

  it("starters must throw", () => {
    expect(starters.length).toBeGreaterThan(0);
    expect(() => starters.forEach($ => $())).toThrow();
  });
});
