/**
 * Resolve site-root paths for static export (nested folders, file://) and dev (absolute /).
 */
(function (global) {
  function detectRoot() {
    if (typeof global.__CALNEX_ROOT__ === "string") {
      return global.__CALNEX_ROOT__;
    }

    var host = (global.location.hostname || "").toLowerCase();
    if (host === "calnexapp.com" || host === "www.calnexapp.com") {
      return "";
    }

    var port = global.location.port || "";
    if (port === "3000" || port === "3001") {
      return "";
    }

    if (global.location.protocol === "file:") {
      var pathname = decodeURIComponent(global.location.pathname || "");
      if (/\/index\.html$/i.test(pathname)) {
        pathname = pathname.replace(/\/index\.html$/i, "/");
      }
      var segments = pathname.split("/").filter(Boolean);
      var outIdx = -1;
      for (var i = 0; i < segments.length; i += 1) {
        if (segments[i].toLowerCase() === "out") {
          outIdx = i;
          break;
        }
      }
      var depth =
        outIdx >= 0
          ? Math.max(0, segments.length - outIdx - 1)
          : Math.max(0, segments.length - 1);
      return depth ? "../".repeat(depth) : "";
    }

    var path = global.location.pathname || "/";
    if (!path.endsWith("/")) {
      path = path.replace(/\/[^/]*$/, "/") || "/";
    }
    var parts = path.split("/").filter(Boolean);
    var depth = parts.length;
    return depth ? "../".repeat(depth) : "";
  }

  function CalnexPath(url) {
    var value = String(url || "");
    if (/^https?:\/\//i.test(value) || /^\/\//.test(value) || /^data:/i.test(value) || /^blob:/i.test(value)) {
      return value;
    }
    var root = detectRoot();
    var normalized = value.charAt(0) === "/" ? value.slice(1) : value;
    return root + normalized;
  }

  function patchNextScriptQueue(queue) {
    if (!queue || typeof queue.push !== "function" || queue.__calnexPatched) return;
    var originalPush = queue.push;
    queue.push = function () {
      for (var i = 0; i < arguments.length; i += 1) {
        var entry = arguments[i];
        if (Array.isArray(entry) && typeof entry[0] === "string" && entry[0].charAt(0) === "/") {
          entry[0] = CalnexPath(entry[0]);
        }
      }
      return originalPush.apply(this, arguments);
    };
    queue.__calnexPatched = true;
  }

  global.CalnexPath = CalnexPath;
  if (typeof global.__CALNEX_ROOT__ !== "string") {
    global.__CALNEX_ROOT__ = detectRoot();
  }

  if (typeof self !== "undefined") {
    patchNextScriptQueue(self.__next_s);
    var watchNextS = global.setInterval(function () {
      patchNextScriptQueue(self.__next_s);
      if (self.__next_s && self.__next_s.__calnexPatched) global.clearInterval(watchNextS);
    }, 0);
    global.setTimeout(function () {
      global.clearInterval(watchNextS);
    }, 3000);
  }
})(typeof window !== "undefined" ? window : globalThis);
