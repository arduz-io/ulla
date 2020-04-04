var loader;
(function(e) {
  "use strict";
  var r = 1;
  var d = 2;
  var i = [];
  var f = { baseUrl: "" };
  var c = {};
  function n(e) {
    if (typeof e === "object") {
      for (var n in e) {
        if (e.hasOwnProperty(n)) {
          f[n] = e[n];
        }
      }
    }
  }
  e.config = n;
  function l(t, e, o) {
    var n = arguments.length;
    if (n === 1) {
      o = t;
      e = ["require", "exports", "module"];
      t = null;
    } else if (n === 2) {
      if (f.toString.call(t) === "[object Array]") {
        o = e;
        e = t;
        t = null;
      } else {
        o = e;
        e = ["require", "exports", "module"];
      }
    }
    if (!t) {
      i.push([e, o]);
      return;
    }
    function r() {
      var e, n;
      if (c[t]) {
        e = c[t].handlers;
        n = c[t].context;
      }
      var r = (c[t] =
        typeof o === "function"
          ? o.apply(null, i.slice.call(arguments, 0)) || c[t] || {}
          : o);
      r.dclamd = d;
      r.context = n;
      for (var l = 0, a = e ? e.length : 0; l < a; l++) {
        e[l](r);
      }
    }
    u(e, r, t);
  }
  e.define = l;
  (function(e) {
    e.amd = {};
  })((l = e.define || (e.define = {})));
  function u(r, l, a) {
    var t = [];
    var o = 0;
    var i = false;
    if (typeof r === "string") {
      if (c[r] && c[r].dclamd === d) {
        return c[r];
      }
      throw new Error(
        r +
          " has not been defined. Please include it as a dependency in " +
          a +
          "'s define()"
      );
    }
    var f = r.length;
    var e = function(n) {
      switch (r[n]) {
        case "require":
          var e = function(e, n) {
            return u(e, n, a);
          };
          e.toUrl = function(e) {
            return p(e, a);
          };
          t[n] = e;
          o++;
          break;
        case "exports":
          t[n] = c[a] || (c[a] = {});
          o++;
          break;
        case "module":
          t[n] = { id: a, uri: p(a) };
          o++;
          break;
        case c[a] ? c[a].context : "":
          t[n] = c[c[a].context];
          o++;
          break;
        default:
          s(
            r[n],
            function(e) {
              t[n] = e;
              o++;
              if (o === f && l) {
                i = true;
                l.apply(null, t);
              }
              if (c[r[n]]) {
                c[r[n]].dclamd = d;
              }
            },
            a
          );
      }
    };
    for (var n = 0; n < f; n++) {
      e(n);
    }
    if (!i && o === f && l) {
      l.apply(null, t);
    }
  }
  e.require = u;
  function t(e, n) {
    return function() {
      if (typeof callRpc !== "undefined") {
        return callRpc(e, n.name, i.slice.call(arguments, 0));
      }
      throw new Error("callRpc is not defined in this environment");
    };
  }
  function s(e, a, n) {
    e = n ? p(e, n) : e;
    if (c[e]) {
      if (c[e].dclamd === r) {
        a && c[e].handlers.push(a);
      } else {
        a && a(c[e]);
      }
      return;
    } else {
      c[e] = { name: e, dclamd: r, handlers: [a], context: n };
    }
    if (e.indexOf("@") === 0) {
      if (typeof loadModule !== "undefined") {
        loadModule(e).then(function(e) {
          var n = {};
          for (var r in e.methods) {
            var l = e.methods[r];
            n[l.name] = t(e.rpcHandle, l);
          }
          a(n);
        });
      } else {
        throw new Error('loadModule is not defined in this environment')
      }
    }
  }
  if (typeof onStart !== "undefined") {
    onStart(function() {
      var e = [];
      for (var n in c) {
        if (c[n] && c[n].dclamd === r) {
          e.push(c[n]);
        }
      }
      if (e.length) {
        throw new Error(
          "These modules didn't load: " +
            e
              .map(function(e) {
                return e.name;
              })
              .join(", ")
        );
      }
    });
  }
  function p(e, n) {
    var r = false;
    switch (e) {
      case "require":
      case "exports":
      case "module":
        return e;
    }
    var l = (n || f.baseUrl).split("/");
    l.pop();
    var a = e.split("/");
    var t = a.length;
    while (--t) {
      switch (e[0]) {
        case "..":
          l.pop();
        case ".":
        case "":
          a.shift();
          r = true;
      }
    }
    return (l.length && r ? l.join("/") + "/" : "") + a.join("/");
  }
  u.toUrl = p;
})(loader || (loader = {}));
global =
  typeof global !== "undefined"
    ? global
    : typeof self !== "undefined"
    ? self
    : typeof this !== "undefined"
    ? this
    : null;
if (!global) throw new Error("unknown global context");
global.define = loader.define;
global.dclamd = loader;
