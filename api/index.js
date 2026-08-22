// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/utils/body.js
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = (method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  };
  this.match = match2;
  return match2(method, path);
}

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      Object.keys(middleware).forEach((m) => {
        if ((method === METHOD_NAME_ALL || method === m) && !middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      });
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          if (!routes[m][path2]) {
            this.#insertPath(m, path2);
            routes[m][path2] = [
              ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
            ];
          }
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = this.#tries = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = /* @__PURE__ */ Object.create(null);
    const handlerData = [];
    [middleware, routes].forEach((r) => {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const paramAssoc = pathData[1];
        handlerData[pathData[0]] = handlers.map(([h, paramCount]) => {
          const paramIndexMap = /* @__PURE__ */ Object.create(null);
          paramCount -= 1;
          for (; paramCount >= 0; paramCount--) {
            const [key, value] = paramAssoc[paramCount];
            paramIndexMap[key] = value;
          }
          return [h, paramIndexMap];
        });
      }
    });
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (let i = 0, len = handlerData.length; i < len; i++) {
      for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
        const map = handlerData[i][j]?.[1];
        if (!map) {
          continue;
        }
        const keys = Object.keys(map);
        for (let k = 0, len3 = keys.length; k < len3; k++) {
          map[keys[k]] = paramReplacementMap[map[keys[k]]];
        }
      }
    }
    const handlerMap = [];
    for (const i in indexReplacementMap) {
      handlerMap[i] = handlerData[indexReplacementMap[i]];
    }
    return [regexp, handlerMap, staticMap];
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var order = 0;
var Node2 = class _Node2 {
  #methods = [];
  #children = /* @__PURE__ */ Object.create(null);
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    } else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else {
      return () => "";
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (exposeHeadersStr) {
      set("Access-Control-Expose-Headers", exposeHeadersStr);
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        c.res.headers.append("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) {
        set("Access-Control-Allow-Methods", allowMethods);
      }
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
        }
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process: process2, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process2 !== void 0 ? (
    // eslint-disable-next-line no-unsafe-optional-chaining
    "NO_COLOR" in process2?.env
  ) : false;
  return !isNoColor;
}
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
};
var colorStatus = async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
};
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
var logger = (fn = console.log) => {
  return async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path, c.res.status, time(start));
  };
};

// node_modules/.pnpm/hono@4.13.3/node_modules/hono/dist/adapter/vercel/handler.js
var handle = (app2) => (req) => {
  return app2.fetch(req);
};

// packages/api/src/config.ts
function loadConfig() {
  const corsEnv = process.env.CORS_ORIGINS;
  const corsOrigins = corsEnv ? corsEnv.split(",").map((s) => s.trim()) : ["*"];
  return {
    port: parseInt(process.env.PORT ?? "3001"),
    mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017",
    mongoDb: process.env.MONGODB_DB ?? "fibertap",
    network: process.env.CKB_NETWORK ?? "testnet",
    ckbRpcUrl: process.env.CKB_RPC_URL ?? "https://testnet.ckbapp.dev/rpc",
    ckbIndexerUrl: process.env.CKB_INDEXER_URL ?? "https://testnet.ckbapp.dev/indexer",
    corsOrigins
  };
}

// packages/api/src/services/storage.ts
import { MongoClient } from "mongodb";

// packages/core/dist/index.js
function generatePaymentId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ft_${timestamp}_${random}`;
}
function isExpired(timestamp) {
  return Date.now() > timestamp;
}
var PAYMENT_EXPIRY_MS = 10 * 60 * 1e3;

// packages/api/src/services/storage.ts
function paymentDocToRequest(doc) {
  return {
    id: doc.id,
    creatorId: doc.creatorId,
    amount: BigInt(doc.amount),
    message: doc.message,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
    txHash: doc.txHash,
    senderAddress: doc.senderAddress,
    status: doc.status
  };
}
function createMongoStorage(uri, dbName = "fibertap") {
  let client;
  let db;
  let creators;
  let payments;
  let webhooks;
  return {
    async connect() {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(dbName);
      creators = db.collection("creators");
      payments = db.collection("payments");
      webhooks = db.collection("webhooks");
      await creators.createIndex({ ckbAddress: 1 }, { unique: true });
      await creators.createIndex({ apiKey: 1 }, { unique: true });
      await payments.createIndex({ creatorId: 1 });
      await payments.createIndex({ status: 1 });
      await payments.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await webhooks.createIndex({ creatorId: 1 });
    },
    async disconnect() {
      if (client) {
        await client.close();
      }
    },
    async createCreator(data) {
      const id = generatePaymentId();
      const apiKey = `ft_live_${generatePaymentId()}`;
      const doc = {
        id,
        ckbAddress: data.ckbAddress,
        displayName: data.displayName,
        createdAt: Date.now(),
        apiKey,
        widgetConfig: {
          theme: "auto",
          position: "bottom-right",
          presetAmounts: [1, 5, 10],
          currency: "ckb",
          customLabel: "Tip"
        }
      };
      await creators.insertOne(doc);
      return doc;
    },
    async getCreatorById(id) {
      return creators.findOne({ id });
    },
    async getCreatorByAddress(address) {
      return creators.findOne({ ckbAddress: address });
    },
    async validateApiKey(key) {
      return creators.findOne({ apiKey: key });
    },
    async updateCreatorConfig(id, config2) {
      const updateFields = {};
      if (config2.theme !== void 0) updateFields["widgetConfig.theme"] = config2.theme;
      if (config2.position !== void 0) updateFields["widgetConfig.position"] = config2.position;
      if (config2.presetAmounts !== void 0) updateFields["widgetConfig.presetAmounts"] = config2.presetAmounts;
      if (config2.currency !== void 0) updateFields["widgetConfig.currency"] = config2.currency;
      if (config2.customLabel !== void 0) updateFields["widgetConfig.customLabel"] = config2.customLabel;
      if (Object.keys(updateFields).length > 0) {
        await creators.updateOne({ id }, { $set: updateFields });
      }
    },
    async createPayment(data) {
      const now = Date.now();
      const doc = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount.toString(),
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
        status: "pending"
      };
      await payments.insertOne(doc);
      return paymentDocToRequest(doc);
    },
    async getPayment(id) {
      const doc = await payments.findOne({ id });
      if (!doc) return null;
      return paymentDocToRequest(doc);
    },
    async confirmPayment(id, txHash, senderAddress) {
      await payments.updateOne(
        { id },
        { $set: { txHash, senderAddress, status: "pending" } }
      );
    },
    async updatePaymentStatus(id, status) {
      await payments.updateOne({ id }, { $set: { status } });
    },
    async getUnconfirmedPayments(limit = 50) {
      const docs = await payments.find({ status: "pending", txHash: { $exists: true } }).limit(limit).toArray();
      return docs.map(paymentDocToRequest);
    },
    async addWebhook(creatorId, url, secret) {
      const webhook = {
        id: generatePaymentId(),
        creatorId,
        url,
        secret,
        createdAt: Date.now()
      };
      await webhooks.insertOne(webhook);
      return webhook;
    },
    async getWebhooks(creatorId) {
      return webhooks.find({ creatorId }).toArray();
    },
    async deleteWebhook(webhookId) {
      const result = await webhooks.deleteOne({ id: webhookId });
      return result.deletedCount > 0;
    }
  };
}
function createMemoryStorage() {
  const creatorStore = /* @__PURE__ */ new Map();
  const paymentStore = /* @__PURE__ */ new Map();
  const webhookStore = /* @__PURE__ */ new Map();
  return {
    async connect() {
    },
    async disconnect() {
    },
    async createCreator(data) {
      const id = generatePaymentId();
      const apiKey = `ft_live_${generatePaymentId()}`;
      const doc = {
        id,
        ckbAddress: data.ckbAddress,
        displayName: data.displayName,
        createdAt: Date.now(),
        apiKey,
        widgetConfig: {
          theme: "auto",
          position: "bottom-right",
          presetAmounts: [1, 5, 10],
          currency: "ckb",
          customLabel: "Tip"
        }
      };
      creatorStore.set(id, doc);
      return doc;
    },
    async getCreatorById(id) {
      return creatorStore.get(id) ?? null;
    },
    async getCreatorByAddress(address) {
      for (const doc of creatorStore.values()) {
        if (doc.ckbAddress === address) return doc;
      }
      return null;
    },
    async validateApiKey(key) {
      for (const doc of creatorStore.values()) {
        if (doc.apiKey === key) return doc;
      }
      return null;
    },
    async updateCreatorConfig(id, config2) {
      const doc = creatorStore.get(id);
      if (doc) {
        doc.widgetConfig = { ...doc.widgetConfig, ...config2 };
      }
    },
    async createPayment(data) {
      const now = Date.now();
      const doc = {
        id: generatePaymentId(),
        creatorId: data.creatorId,
        amount: data.amount.toString(),
        message: data.message,
        createdAt: now,
        expiresAt: now + PAYMENT_EXPIRY_MS,
        status: "pending"
      };
      paymentStore.set(doc.id, doc);
      return paymentDocToRequest(doc);
    },
    async getPayment(id) {
      const doc = paymentStore.get(id);
      if (!doc) return null;
      return paymentDocToRequest(doc);
    },
    async confirmPayment(id, txHash, senderAddress) {
      const doc = paymentStore.get(id);
      if (doc) {
        doc.txHash = txHash;
        doc.senderAddress = senderAddress;
        doc.status = "pending";
      }
    },
    async updatePaymentStatus(id, status) {
      const doc = paymentStore.get(id);
      if (doc) {
        doc.status = status;
      }
    },
    async getUnconfirmedPayments(limit = 50) {
      const results = [];
      for (const doc of paymentStore.values()) {
        if (doc.status === "pending" && doc.txHash) {
          results.push(doc);
          if (results.length >= limit) break;
        }
      }
      return results.map(paymentDocToRequest);
    },
    async addWebhook(creatorId, url, secret) {
      const webhook = {
        id: generatePaymentId(),
        creatorId,
        url,
        secret,
        createdAt: Date.now()
      };
      const existing = webhookStore.get(creatorId) ?? [];
      existing.push(webhook);
      webhookStore.set(creatorId, existing);
      return webhook;
    },
    async getWebhooks(creatorId) {
      return webhookStore.get(creatorId) ?? [];
    },
    async deleteWebhook(webhookId) {
      for (const [key, hooks] of webhookStore.entries()) {
        const idx = hooks.findIndex((h) => h.id === webhookId);
        if (idx !== -1) {
          hooks.splice(idx, 1);
          webhookStore.set(key, hooks);
          return true;
        }
      }
      return false;
    }
  };
}

// packages/api/src/middleware/auth.ts
var PUBLIC_PREFIXES = [
  "/api/payments/request",
  "/api/payments/",
  "/api/creators/register",
  "/api/creators/",
  "/health"
];
function isPublicEndpoint(path, method) {
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    if (method !== "GET" && path.startsWith("/api/creators/") && !path.endsWith("/register") && (path.endsWith("/config") || path.includes("/webhooks"))) {
      return false;
    }
    return true;
  }
  return false;
}
function createAuthMiddleware(storage2) {
  return async (c, next) => {
    const path = c.req.path;
    const method = c.req.method;
    if (isPublicEndpoint(path, method)) {
      return next();
    }
    const apiKey = c.req.header("x-api-key");
    if (!apiKey) {
      return c.json({ error: "Missing x-api-key header" }, 401);
    }
    const creator = await storage2.validateApiKey(apiKey);
    if (!creator) {
      return c.json({ error: "Invalid API key" }, 401);
    }
    c.set("creator", creator);
    return next();
  };
}

// packages/api/src/middleware/rateLimit.ts
var rateLimits = /* @__PURE__ */ new Map();
var MAX_REQUESTS = 100;
var MAX_ENTRIES = 1e4;
var WINDOW_MS = 60 * 1e3;
var cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, WINDOW_MS);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
async function rateLimitMiddleware(c, next) {
  const key = c.req.header("x-api-key") ?? c.req.header("x-forwarded-for") ?? "anonymous";
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    if (rateLimits.size >= MAX_ENTRIES) {
      const oldest = rateLimits.keys().next().value;
      if (oldest) rateLimits.delete(oldest);
    }
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  if (entry.count >= MAX_REQUESTS) {
    return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
  }
  entry.count++;
  return next();
}

// packages/api/src/routes/creators.ts
import crypto2 from "crypto";
function createCreatorRoutes(storage2) {
  const app2 = new Hono2();
  app2.post("/register", async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { ckbAddress, displayName } = body;
    if (!ckbAddress || !displayName) {
      return c.json({ error: "ckbAddress and displayName are required" }, 400);
    }
    if (!/^(ckb1q|ckt1q)[a-z0-9]+$/i.test(ckbAddress) || ckbAddress.length < 46) {
      return c.json({ error: "Invalid CKB address format" }, 400);
    }
    if (displayName.length < 1 || displayName.length > 100) {
      return c.json({ error: "displayName must be between 1 and 100 characters" }, 400);
    }
    const existing = await storage2.getCreatorByAddress(ckbAddress);
    if (existing) {
      return c.json({ error: "Address already registered" }, 409);
    }
    const creator = await storage2.createCreator({ ckbAddress, displayName });
    return c.json(
      {
        id: creator.id,
        apiKey: creator.apiKey,
        ckbAddress: creator.ckbAddress,
        displayName: creator.displayName
      },
      201
    );
  });
  app2.get("/:id", async (c) => {
    const id = c.req.param("id");
    const creator = await storage2.getCreatorById(id);
    if (!creator) {
      return c.json({ error: "Creator not found" }, 404);
    }
    return c.json({
      id: creator.id,
      displayName: creator.displayName,
      ckbAddress: creator.ckbAddress,
      createdAt: creator.createdAt,
      widgetConfig: creator.widgetConfig
    });
  });
  app2.patch("/:id/config", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");
    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { theme, presetAmounts, customLabel } = body;
    const configUpdate = {};
    if (theme) configUpdate.theme = theme;
    if (presetAmounts && Array.isArray(presetAmounts)) configUpdate.presetAmounts = presetAmounts;
    if (customLabel) configUpdate.customLabel = customLabel;
    if (Object.keys(configUpdate).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    await storage2.updateCreatorConfig(id, configUpdate);
    return c.json({ success: true });
  });
  app2.post("/:id/webhooks", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");
    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { url } = body;
    if (!url) {
      return c.json({ error: "url is required" }, 400);
    }
    try {
      new URL(url);
    } catch {
      return c.json({ error: "Invalid URL format" }, 400);
    }
    const secret = `whsec_${crypto2.randomBytes(32).toString("hex")}`;
    const webhook = await storage2.addWebhook(id, url, secret);
    return c.json({ webhookId: webhook.id, secret }, 201);
  });
  app2.delete("/:id/webhooks/:webhookId", async (c) => {
    const creator = c.get("creator");
    const id = c.req.param("id");
    const webhookId = c.req.param("webhookId");
    if (creator.id !== id) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const deleted = await storage2.deleteWebhook(webhookId);
    if (!deleted) {
      return c.json({ error: "Webhook not found" }, 404);
    }
    return c.json({ success: true });
  });
  return app2;
}

// packages/api/src/routes/payments.ts
function createPaymentRoutes(storage2) {
  const app2 = new Hono2();
  app2.post("/request", async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { creatorAddress, amount, message, senderAddress } = body;
    if (!creatorAddress || !amount) {
      return c.json({ error: "creatorAddress and amount are required" }, 400);
    }
    const sanitizedMessage = sanitizeInput(message ?? "");
    const creator = await storage2.getCreatorByAddress(creatorAddress);
    if (!creator) {
      return c.json({ error: "Creator not found" }, 404);
    }
    let amountBigInt;
    try {
      amountBigInt = BigInt(amount);
    } catch {
      return c.json({ error: "Invalid amount format" }, 400);
    }
    if (amountBigInt <= 0n) {
      return c.json({ error: "Amount must be positive" }, 400);
    }
    const payment = await storage2.createPayment({
      creatorId: creator.id,
      amount: amountBigInt,
      message: sanitizedMessage
    });
    return c.json(
      {
        paymentId: payment.id,
        expiresAt: payment.expiresAt
      },
      201
    );
  });
  app2.post("/:id/confirm", async (c) => {
    const id = c.req.param("id");
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const { txHash, senderAddress } = body;
    if (!txHash || !senderAddress) {
      return c.json({ error: "txHash and senderAddress are required" }, 400);
    }
    if (!/^0x[0-9a-f]+$/i.test(txHash)) {
      return c.json({ error: "Invalid txHash format" }, 400);
    }
    const payment = await storage2.getPayment(id);
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }
    if (isExpired(payment.expiresAt)) {
      return c.json({ error: "Payment request expired" }, 410);
    }
    await storage2.confirmPayment(id, txHash, senderAddress);
    return c.json({
      status: "pending",
      paymentId: id,
      txHash
    });
  });
  app2.get("/:id/status", async (c) => {
    const id = c.req.param("id");
    const payment = await storage2.getPayment(id);
    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }
    return c.json({
      status: payment.status ?? "pending",
      amount: payment.amount.toString(),
      message: payment.message,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt
    });
  });
  return app2;
}
function sanitizeInput(input) {
  return input.replace(/[<>]/g, "").replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").trim().slice(0, 200);
}

// packages/api/src/landing.ts
var LANDING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FiberTap \u2014 One Script. Instant Crypto Tips.</title>
  <meta name="description" content="Add CKB micropayments to any website with a single script tag. No accounts. No custodial wallets. No fees.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a14; --bg2: #10101f; --bg3: #181830;
      --border: #1e1e3a; --text: #e8e8f0; --muted: #8888a8; --dim: #555570;
      --accent: #6366f1; --accent-light: #818cf8; --accent-dim: #3730a3;
      --green: #22c55e; --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg); color: var(--text);
      overflow-x: hidden; line-height: 1.6;
    }

    /* \u2500\u2500 Gradient orbs \u2500\u2500 */
    .orb {
      position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
      filter: blur(100px);
    }
    .orb-1 { width: 600px; height: 600px; top: -200px; right: -100px; background: rgba(99,102,241,0.08); }
    .orb-2 { width: 500px; height: 500px; bottom: -150px; left: -100px; background: rgba(34,197,94,0.05); }

    /* \u2500\u2500 Nav \u2500\u2500 */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      padding: 14px 40px; display: flex; align-items: center; justify-content: space-between;
      background: rgba(10,10,20,0.85); backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(30,30,58,0.4);
    }
    .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); }
    .nav-logo {
      width: 32px; height: 32px; background: var(--accent); border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; color: white; letter-spacing: -0.5px;
    }
    .nav-name { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
    .nav-name span { color: var(--accent-light); }
    .nav-links { display: flex; gap: 28px; align-items: center; }
    .nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover { color: var(--text); }
    .nav-cta {
      padding: 8px 20px; border-radius: 8px; background: var(--accent);
      color: white !important; font-weight: 600; font-size: 13px;
      transition: all 0.2s;
    }
    .nav-cta:hover { background: var(--accent-light); transform: translateY(-1px); }

    /* \u2500\u2500 Hero \u2500\u2500 */
    .hero {
      min-height: 80vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center;
      padding: 120px 24px 60px; position: relative; z-index: 1;
    }
    .hero h1 {
      font-size: clamp(36px, 6vw, 64px); font-weight: 900; line-height: 1.1;
      letter-spacing: -2px; margin-bottom: 16px; max-width: 700px;
    }
    .hero h1 .gradient {
      background: linear-gradient(135deg, var(--accent-light), #a78bfa, #ec4899);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: 17px; color: var(--muted); max-width: 500px;
      margin-bottom: 12px; line-height: 1.7;
    }
    .hero-sub {
      font-size: 14px; color: var(--dim); margin-bottom: 32px;
    }
    .hero-btn {
      display: inline-block;
      padding: 13px 32px; border-radius: 10px; background: var(--accent);
      color: white; font-size: 15px; font-weight: 600; text-decoration: none;
      transition: all 0.2s; border: none; cursor: pointer; font-family: inherit;
    }
    .hero-btn:hover { background: var(--accent-light); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }

    /* \u2500\u2500 Code snippet \u2500\u2500 */
    .code-hero {
      margin-top: 40px; width: 100%; max-width: 560px;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden; text-align: left;
    }
    .code-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 14px; background: var(--bg3); border-bottom: 1px solid var(--border);
    }
    .code-dot { width: 10px; height: 10px; border-radius: 50%; }
    .code-dot:nth-child(1) { background: #ef4444; }
    .code-dot:nth-child(2) { background: #eab308; }
    .code-dot:nth-child(3) { background: #22c55e; }
    .code-body {
      padding: 16px 18px; font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px; line-height: 1.8; color: #c4b5fd; overflow-x: auto;
    }
    .code-body .tag { color: #f472b6; }
    .code-body .attr { color: #fbbf24; }
    .code-body .str { color: #34d399; }
    .code-body .cmt { color: #4a4a6a; }

    /* \u2500\u2500 Social proof / Stats \u2500\u2500 */
    .stats {
      padding: 48px 24px; text-align: center; position: relative; z-index: 1;
    }
    .stats-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 20px; }
    .stats-row {
      display: flex; justify-content: center; gap: 48px; flex-wrap: wrap;
    }
    .stat-num { font-size: 28px; font-weight: 800; color: var(--text); }
    .stat-label { font-size: 12px; color: var(--muted); margin-top: 2px; }

    /* \u2500\u2500 Features (left icon + text, right code) \u2500\u2500 */
    .features {
      padding: 64px 24px; max-width: 960px; margin: 0 auto;
      position: relative; z-index: 1;
    }
    .feature-row {
      display: grid; grid-template-columns: 1fr 1.1fr; gap: 40px;
      align-items: center; margin-bottom: 56px;
    }
    .feature-row:last-child { margin-bottom: 0; }
    .feature-row.reverse { direction: rtl; }
    .feature-row.reverse > * { direction: ltr; }
    .feature-left { display: flex; flex-direction: column; gap: 12px; }
    .feature-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; margin-bottom: 4px;
    }
    .feature-left h3 { font-size: 18px; font-weight: 700; }
    .feature-left p { font-size: 14px; color: var(--muted); line-height: 1.7; }
    .feature-right {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 12px; padding: 18px; overflow: hidden;
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      line-height: 1.9; color: #c4b5fd; white-space: pre;
    }

    /* \u2500\u2500 How it works \u2500\u2500 */
    .how {
      padding: 72px 24px; max-width: 860px; margin: 0 auto;
      position: relative; z-index: 1;
    }
    .how h2 { text-align: center; font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 48px; }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
    .step { text-align: center; }
    .step-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      color: white; font-size: 18px; font-weight: 800; margin-bottom: 14px;
    }
    .step h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
    .step p { font-size: 13px; color: var(--muted); }

    /* \u2500\u2500 Platforms \u2500\u2500 */
    .platforms {
      padding: 56px 24px; text-align: center; position: relative; z-index: 1;
    }
    .platforms h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; }
    .platforms > p { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
    .platform-tags {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;
      max-width: 640px; margin: 0 auto;
    }
    .platform-tag {
      padding: 8px 16px; border-radius: 8px;
      background: var(--bg2); border: 1px solid var(--border);
      font-size: 13px; font-weight: 500; color: var(--text);
      transition: all 0.2s;
    }
    .platform-tag:hover { border-color: var(--accent); color: var(--accent-light); }

    /* \u2500\u2500 CTA Card \u2500\u2500 */
    .cta-card {
      max-width: 580px; margin: 64px auto; padding: 48px 36px;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 20px; text-align: center;
      position: relative; z-index: 1;
    }
    .cta-card h2 { font-size: 26px; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.5px; }
    .cta-card p { font-size: 15px; color: var(--muted); margin-bottom: 8px; }
    .cta-card .cta-links {
      display: flex; gap: 12px; justify-content: center; margin-top: 24px;
    }
    .cta-card .btn-outline {
      padding: 12px 28px; border-radius: 10px; background: transparent;
      border: 1px solid var(--border); color: var(--text); font-size: 14px;
      font-weight: 600; text-decoration: none; transition: all 0.2s;
      font-family: inherit; cursor: pointer;
    }
    .cta-card .btn-outline:hover { border-color: var(--muted); background: rgba(255,255,255,0.03); }

    /* \u2500\u2500 Footer \u2500\u2500 */
    footer {
      padding: 32px 40px; text-align: left; border-top: 1px solid var(--border);
      position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center;
    }
    footer p { font-size: 13px; color: var(--dim); }
    footer a { color: var(--muted); text-decoration: none; }
    footer a:hover { color: var(--text); }
    .footer-links { display: flex; gap: 20px; }
    .footer-links a { font-size: 13px; }

    /* \u2500\u2500 Responsive \u2500\u2500 */
    @media (max-width: 768px) {
      nav { padding: 12px 16px; }
      .nav-links { gap: 16px; }
      .feature-row { grid-template-columns: 1fr; gap: 20px; }
      .feature-row.reverse { direction: ltr; }
      .steps { grid-template-columns: 1fr; gap: 36px; }
      .stats-row { gap: 28px; }
      footer { flex-direction: column; gap: 12px; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>

  <nav>
    <a href="/" class="nav-brand">
      <div class="nav-logo">FT</div>
      <div class="nav-name">Fiber<span>Tap</span></div>
    </a>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#how">How it Works</a>
      <a href="#docs">Docs</a>
      <a href="https://github.com/FidelCoder/FiberTap" target="_blank">GitHub</a>
      <a href="#docs" class="nav-cta">Get Started</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <h1>One Script.<br><span class="gradient">Instant Crypto Tips.</span></h1>
    <p>Add a floating tip button to any website. Your visitors send CKB micropayments directly from their wallets \u2014 no accounts, no middlemen, no fees.</p>
    <p class="hero-sub">Built on CKB Fiber Network \xB7 Open source \xB7 Zero custody</p>
    <button class="hero-btn" onclick="openGenerator()">Add to Your Site</button>

    <div class="code-hero">
      <div class="code-bar">
        <div class="code-dot"></div><div class="code-dot"></div><div class="code-dot"></div>
      </div>
      <div class="code-body">
<span class="cmt">&lt;!-- Add before &lt;/body&gt; --&gt;</span>
<span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_CKB_ADDRESS"</span>
<span class="tag">&gt;&lt;/script&gt;</span>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="stats">
    <div class="stats-label">Built for the decentralized web</div>
    <div class="stats-row">
      <div><div class="stat-num">0%</div><div class="stat-label">Platform Fees</div></div>
      <div><div class="stat-num">&lt;1s</div><div class="stat-label">Integration Time</div></div>
      <div><div class="stat-num">0</div><div class="stat-label">Accounts Required</div></div>
      <div><div class="stat-num">21KB</div><div class="stat-label">Widget Size</div></div>
    </div>
  </section>

  <!-- Features -->
  <section class="features" id="features">

    <!-- Feature 1: One-Line Integration -->
    <div class="feature-row">
      <div class="feature-left">
        <div class="feature-icon" style="background: rgba(99,102,241,0.1);">\u26A1</div>
        <h3>One-Line Integration</h3>
        <p>Paste a single script tag before &lt;/body&gt; and you're live. No build step, no framework dependency, no npm install. Works with any website technology \u2014 HTML, React, Next.js, WordPress, Hugo, you name it.</p>
      </div>
      <div class="feature-right"><span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"ckb1qy..."</span>
  <span class="attr">data-theme</span>=<span class="str">"dark"</span>
  <span class="attr">data-position</span>=<span class="str">"bottom-right"</span>
<span class="tag">&gt;&lt;/script&gt;</span></div>
    </div>

    <!-- Feature 2: Non-Custodial -->
    <div class="feature-row reverse">
      <div class="feature-left">
        <div class="feature-icon" style="background: rgba(34,197,94,0.1);">\u{1F512}</div>
        <h3>Non-Custodial</h3>
        <p>Payments go directly from viewer to creator wallets. FiberTap never holds, controls, or touches your money. Zero counterparty risk. Your keys, your crypto.</p>
      </div>
      <div class="feature-right"><span class="cmt">// Viewer's wallet \u2192 Creator's wallet</span>
<span class="cmt">// Direct peer-to-peer transfer</span>
<span class="cmt">// via CKB Fiber Network channels</span>

<span class="tag">payment</span>.<span class="attr">from</span> = <span class="str">"viewer"</span>
<span class="tag">payment</span>.<span class="attr">to</span>   = <span class="str">"creator"</span>
<span class="tag">payment</span>.<span class="attr">via</span>   = <span class="str">"fiber"</span>
<span class="tag">payment</span>.<span class="attr">custody</span> = <span class="str">"none"</span></div>
    </div>

    <!-- Feature 3: Webhooks & Notifications -->
    <div class="feature-row">
      <div class="feature-left">
        <div class="feature-icon" style="background: rgba(251,191,36,0.1);">\u{1F4E1}</div>
        <h3>Webhook Notifications</h3>
        <p>Get real-time HTTP callbacks when payments are confirmed on-chain. Build Discord bots, analytics dashboards, or unlock premium content automatically. HMAC-SHA256 signed for security.</p>
      </div>
      <div class="feature-right"><span class="tag">app</span>.<span class="attr">post</span>(<span class="str">"/webhook"</span>, (req) => {
  <span class="cmt">// Verify HMAC-SHA256 signature</span>
  <span class="tag">verify</span>(req.<span class="attr">signature</span>, secret)

  <span class="cmt">// Handle confirmed payment</span>
  <span class="tag">const</span> { type, amount } = req.body

  <span class="tag">if</span> (type === <span class="str">"payment.confirmed"</span>) {
    <span class="tag">unlock</span>(req.body.senderAddress)
  }
})</div>
    </div>

  </section>

  <!-- How it works -->
  <section class="how" id="how">
    <h2>How It Works</h2>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <h3>Add the Widget</h3>
        <p>Paste the script tag on your site. Customize theme, position, and preset amounts with data attributes.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <h3>Visitors Tip You</h3>
        <p>They click the floating button, pick an amount, and confirm in their CKB wallet. QR codes work too.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <h3>Receive CKB</h3>
        <p>Payments land directly in your wallet on the CKB Fiber Network. Webhooks notify you instantly.</p>
      </div>
    </div>
  </section>

  <!-- Platforms -->
  <section class="platforms" id="platforms">
    <h2>Works Everywhere</h2>
    <p>Add FiberTap to any platform with a website or custom HTML.</p>
    <div class="platform-tags">
      <div class="platform-tag">WordPress</div>
      <div class="platform-tag">Ghost</div>
      <div class="platform-tag">Substack</div>
      <div class="platform-tag">GitHub Pages</div>
      <div class="platform-tag">Next.js</div>
      <div class="platform-tag">React</div>
      <div class="platform-tag">Vue</div>
      <div class="platform-tag">Svelte</div>
      <div class="platform-tag">Astro</div>
      <div class="platform-tag">Hugo</div>
      <div class="platform-tag">Jekyll</div>
      <div class="platform-tag">Webflow</div>
      <div class="platform-tag">Framer</div>
      <div class="platform-tag">Squarespace</div>
      <div class="platform-tag">Discord Bots</div>
      <div class="platform-tag">Notion</div>
    </div>
  </section>

  <!-- CTA Card -->
  <section class="cta-card" id="docs">
    <h2>Start Receiving Tips Today</h2>
    <p>Free. Open source. No sign-up required.</p>
    <div class="cta-links">
      <a href="/docs" class="hero-btn">Read the Docs</a>
      <a href="https://github.com/FidelCoder/FiberTap" target="_blank" class="btn-outline">View on GitHub</a>
    </div>
  </section>

  <footer>
    <p>Built with \u{1F49C} on the <a href="https://www.nervos.org" target="_blank">Nervos CKB</a> Fiber Network</p>
    <div class="footer-links">
      <a href="#features">Features</a>
      <a href="#how">How it Works</a>
      <a href="https://github.com/FidelCoder/FiberTap" target="_blank">GitHub</a>
    </div>
  </footer>
  <!-- Script Generator Modal -->
  <div id="generator-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);">
    <div style="position:absolute;inset:0;" onclick="closeGenerator()"></div>
    <div style="position:relative;max-width:560px;margin:8vh auto;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:36px;box-shadow:0 24px 64px rgba(0,0,0,0.5);">
      <button onclick="closeGenerator()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <h2 style="font-size:22px;font-weight:800;margin-bottom:6px;letter-spacing:-0.5px;">Generate Your Widget</h2>
      <p style="font-size:14px;color:var(--muted);margin-bottom:24px;">Paste your CKB wallet address and customize the widget. Copy the code \u2014 paste it before &lt;/body&gt; on your site.</p>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">CKB Wallet Address *</label>
        <input id="gen-address" type="text" placeholder="ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c" style="width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;" oninput="updateGenerated()">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Theme</label>
          <select id="gen-theme" onchange="updateGenerated()" style="width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;cursor:pointer;">
            <option value="auto">Auto (system)</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Position</label>
          <select id="gen-position" onchange="updateGenerated()" style="width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;cursor:pointer;">
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Preset Amounts (CKB)</label>
          <input id="gen-presets" type="text" value="1, 5, 10" oninput="updateGenerated()" style="width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Button Label</label>
          <input id="gen-label" type="text" value="Tip" oninput="updateGenerated()" style="width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;box-sizing:border-box;">
        </div>
      </div>

      <div style="position:relative;">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Your Code</label>
        <pre id="gen-code" style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin:0;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.8;color:#c4b5fd;overflow-x:auto;white-space:pre-wrap;word-break:break-all;"></pre>
        <button id="gen-copy" onclick="copyGenerated()" style="position:absolute;top:36px;right:10px;padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--dim);font-size:11px;font-family:'Inter',sans-serif;cursor:pointer;transition:all 0.15s;">Copy Code</button>
      </div>
    </div>
  </div>

  <script>
    function openGenerator() {
      document.getElementById('generator-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
      updateGenerated();
    }
    function closeGenerator() {
      document.getElementById('generator-modal').style.display = 'none';
      document.body.style.overflow = '';
    }
    function updateGenerated() {
      var addr = document.getElementById('gen-address').value.trim();
      var theme = document.getElementById('gen-theme').value;
      var pos = document.getElementById('gen-position').value;
      var presets = document.getElementById('gen-presets').value.trim();
      var label = document.getElementById('gen-label').value.trim() || 'Tip';
      var origin = window.location.origin;
      var lines = [
        '<!-- FiberTap Widget - Add before </body> -->',
        '<script',
        '  src="' + origin + '/widget.min.js"',
        '  data-creator="' + (addr || 'YOUR_CKB_ADDRESS') + '"',
        '  data-theme="' + theme + '"',
        '  data-position="' + pos + '"',
      ];
      if (presets) lines.push('  data-presets="' + presets + '"');
      if (label !== 'Tip') lines.push('  data-label="' + label + '"');
      lines.push('></' + 'script>');
      document.getElementById('gen-code').textContent = lines.join('
');
    }
    function copyGenerated() {
      var text = document.getElementById('gen-code').textContent;
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('gen-copy');
        btn.textContent = 'Copied!';
        btn.style.color = '#22c55e';
        btn.style.borderColor = '#22c55e';
        setTimeout(function() {
          btn.textContent = 'Copy Code';
          btn.style.color = '';
          btn.style.borderColor = '';
        }, 2000);
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeGenerator();
    });
  </script>
</body>
</html>`;

// packages/api/src/docs.ts
var DOCS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FiberTap Docs \u2014 Integration Guide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a14; --bg2: #10101f; --bg3: #181830;
      --border: #1e1e3a; --text: #e8e8f0; --muted: #8888a8; --dim: #555570;
      --accent: #6366f1; --accent-light: #818cf8; --accent-dim: #3730a3;
      --green: #22c55e; --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg); color: var(--text);
      line-height: 1.7; overflow-x: hidden;
    }

    /* \u2500\u2500 Nav \u2500\u2500 */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      padding: 14px 40px; display: flex; align-items: center; justify-content: space-between;
      background: rgba(10,10,20,0.9); backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(30,30,58,0.4);
    }
    .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); }
    .nav-logo {
      width: 32px; height: 32px; background: var(--accent); border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; color: white;
    }
    .nav-name { font-size: 17px; font-weight: 700; }
    .nav-name span { color: var(--accent-light); }
    .nav-links { display: flex; gap: 24px; align-items: center; }
    .nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--text); }
    .nav-cta {
      padding: 8px 20px; border-radius: 8px; background: var(--accent);
      color: white !important; font-weight: 600; font-size: 13px; transition: all 0.2s;
    }
    .nav-cta:hover { background: var(--accent-light); }

    /* \u2500\u2500 Layout \u2500\u2500 */
    .layout {
      display: grid; grid-template-columns: 220px 1fr;
      max-width: 1100px; margin: 0 auto; padding-top: 70px;
      min-height: 100vh;
    }

    /* \u2500\u2500 Sidebar \u2500\u2500 */
    .sidebar {
      position: sticky; top: 70px; height: calc(100vh - 70px);
      padding: 32px 20px 32px 24px; border-right: 1px solid var(--border);
      overflow-y: auto;
    }
    .sidebar-group { margin-bottom: 24px; }
    .sidebar-group h4 {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: var(--dim); margin-bottom: 10px;
    }
    .sidebar-group a {
      display: block; padding: 6px 10px; margin: 2px 0; border-radius: 6px;
      color: var(--muted); text-decoration: none; font-size: 13px; font-weight: 500;
      transition: all 0.15s;
    }
    .sidebar-group a:hover { color: var(--text); background: rgba(99,102,241,0.06); }
    .sidebar-group a.active { color: var(--accent-light); background: rgba(99,102,241,0.1); }

    /* \u2500\u2500 Content \u2500\u2500 */
    .content {
      padding: 40px 48px 80px; max-width: 760px;
    }
    .content h1 {
      font-size: 32px; font-weight: 800; letter-spacing: -1px;
      margin-bottom: 8px; line-height: 1.2;
    }
    .content .subtitle {
      font-size: 16px; color: var(--muted); margin-bottom: 36px; line-height: 1.6;
    }
    .content h2 {
      font-size: 22px; font-weight: 700; letter-spacing: -0.5px;
      margin: 48px 0 12px; padding-top: 16px; border-top: 1px solid var(--border);
    }
    .content h2:first-of-type { border-top: none; margin-top: 0; }
    .content h3 {
      font-size: 17px; font-weight: 700; margin: 28px 0 8px;
    }
    .content p { font-size: 15px; color: var(--muted); margin-bottom: 14px; }
    .content a { color: var(--accent-light); text-decoration: none; }
    .content a:hover { text-decoration: underline; }
    .content ul { padding-left: 20px; margin-bottom: 14px; }
    .content li { font-size: 15px; color: var(--muted); margin-bottom: 6px; }
    .content li strong { color: var(--text); }

    /* \u2500\u2500 Code blocks \u2500\u2500 */
    pre {
      background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
      padding: 16px 18px; margin: 12px 0 18px; overflow-x: auto;
      font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
      line-height: 1.8; color: #c4b5fd;
    }
    code {
      font-family: 'JetBrains Mono', monospace; font-size: 13px;
      background: rgba(99,102,241,0.1); padding: 2px 7px; border-radius: 5px;
      color: var(--accent-light);
    }
    pre code { background: none; padding: 0; color: inherit; }
    .tag { color: #f472b6; }
    .attr { color: #fbbf24; }
    .str { color: #34d399; }
    .cmt { color: #4a4a6a; }
    .kw { color: #c084fc; }
    .fn { color: #67e8f9; }

    /* \u2500\u2500 Info boxes \u2500\u2500 */
    .info-box {
      padding: 14px 18px; border-radius: 10px; margin: 16px 0;
      border-left: 3px solid; font-size: 14px; line-height: 1.6;
    }
    .info-box.tip { background: rgba(34,197,94,0.06); border-color: var(--green); color: #86efac; }
    .info-box.warn { background: rgba(251,191,36,0.06); border-color: #eab308; color: #fde68a; }
    .info-box.note { background: rgba(99,102,241,0.06); border-color: var(--accent); color: var(--accent-light); }

    /* \u2500\u2500 Table \u2500\u2500 */
    table {
      width: 100%; border-collapse: collapse; margin: 14px 0 20px;
      font-size: 13px;
    }
    th {
      text-align: left; padding: 10px 12px; background: var(--bg3);
      border: 1px solid var(--border); font-weight: 600; color: var(--text);
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    td {
      padding: 10px 12px; border: 1px solid var(--border);
      color: var(--muted); vertical-align: top;
    }
    td code { font-size: 12px; }

    /* \u2500\u2500 Copy button \u2500\u2500 */
    .code-block { position: relative; }
    .copy-btn {
      position: absolute; top: 10px; right: 10px;
      padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--bg3); color: var(--dim); font-size: 11px;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s;
    }
    .copy-btn:hover { border-color: var(--muted); color: var(--text); }
    .copy-btn.copied { color: var(--green); border-color: var(--green); }

    /* \u2500\u2500 Platform cards \u2500\u2500 */
    .platform-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px; margin: 14px 0 20px;
    }
    .platform-card {
      padding: 14px; border-radius: 10px; background: var(--bg2);
      border: 1px solid var(--border); transition: all 0.2s;
    }
    .platform-card:hover { border-color: rgba(99,102,241,0.3); }
    .platform-card h4 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .platform-card p { font-size: 12px; color: var(--dim); margin: 0; }

    /* \u2500\u2500 Responsive \u2500\u2500 */
    @media (max-width: 768px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar {
        position: static; height: auto; border-right: none;
        border-bottom: 1px solid var(--border); padding: 16px;
      }
      .content { padding: 24px 20px 60px; }
      nav { padding: 12px 16px; }
      .nav-links { gap: 14px; }
    }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="nav-brand">
      <div class="nav-logo">FT</div>
      <div class="nav-name">Fiber<span>Tap</span></div>
    </a>
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/docs" class="active">Docs</a>
      <a href="https://github.com/FidelCoder/FiberTap" target="_blank">GitHub</a>
    </div>
  </nav>

  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-group">
        <h4>Getting Started</h4>
        <a href="#quickstart" class="active">Quick Start</a>
        <a href="#installation">Installation</a>
        <a href="#test-locally">Test Locally</a>
      </div>
      <div class="sidebar-group">
        <h4>Widget</h4>
        <a href="#configuration">Configuration</a>
        <a href="#themes">Themes</a>
        <a href="#position">Position</a>
        <a href="#custom-api">Custom API</a>
        <a href="#manual-init">Manual Init</a>
      </div>
      <div class="sidebar-group">
        <h4>Platforms</h4>
        <a href="#wordpress">WordPress</a>
        <a href="#nextjs">Next.js</a>
        <a href="#react">React</a>
        <a href="#ghost">Ghost / Substack</a>
        <a href="#hugo">Hugo</a>
        <a href="#github-pages">GitHub Pages</a>
        <a href="#discord">Discord Bot</a>
      </div>
      <div class="sidebar-group">
        <h4>Advanced</h4>
        <a href="#webhooks">Webhooks</a>
        <a href="#api-ref">API Reference</a>
        <a href="#troubleshooting">Troubleshooting</a>
      </div>
    </aside>

    <main class="content">
      <!-- Quick Start -->
      <h1 id="quickstart">Quick Start</h1>
      <p class="subtitle">Add CKB micropayments to any website in under 2 minutes. One script tag \u2014 that's the entire integration.</p>

      <h2 id="installation">Installation</h2>
      <p>Paste this single script tag before the closing <code>&lt;/body&gt;</code> on your website:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_CKB_ADDRESS_HERE"</span>
<span class="tag">&gt;&lt;/script&gt;</span></code></pre>
      </div>

      <p>Replace <code>YOUR_CKB_ADDRESS_HERE</code> with your actual CKB wallet address:</p>
      <ul>
        <li><strong>Mainnet:</strong> starts with <code>ckb1q...</code></li>
        <li><strong>Testnet:</strong> starts with <code>ckt1q...</code></li>
      </ul>

      <div class="info-box tip">
        \u{1F4A1} <strong>No API key needed.</strong> Just paste the script and you're live. The widget works with any static HTML page.
      </div>

      <h2 id="test-locally">Test Locally</h2>
      <p>Create a file called <code>test.html</code> and open it in your browser:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="tag">&lt;!DOCTYPE html&gt;</span>
<span class="tag">&lt;html&gt;</span>
<span class="tag">&lt;head&gt;</span><span class="tag">&lt;title&gt;</span>My Website<span class="tag">&lt;/title&gt;</span><span class="tag">&lt;/head&gt;</span>
<span class="tag">&lt;body&gt;</span>
  <span class="tag">&lt;h1&gt;</span>Welcome to My Site<span class="tag">&lt;/h1&gt;</span>
  <span class="tag">&lt;p&gt;</span>Visitors can now tip me with CKB.<span class="tag">&lt;/p&gt;</span>

  <span class="tag">&lt;script</span>
    <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
    <span class="attr">data-creator</span>=<span class="str">"ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c"</span>
  <span class="tag">&gt;&lt;/script&gt;</span>
<span class="tag">&lt;/body&gt;</span>
<span class="tag">&lt;/html&gt;</span></code></pre>
      </div>

      <p>You'll see a floating tip button in the bottom-right corner. Click it to test the payment flow.</p>

      <!-- Configuration -->
      <h2 id="configuration">Configuration</h2>
      <p>Customize the widget with <code>data-</code> attributes on the script tag:</p>

      <table>
        <thead>
          <tr><th>Attribute</th><th>Type</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>data-creator</code></td><td>string</td><td>(required)</td><td>CKB address to receive payments</td></tr>
          <tr><td><code>data-theme</code></td><td>string</td><td><code>auto</code></td><td><code>light</code>, <code>dark</code>, or <code>auto</code></td></tr>
          <tr><td><code>data-position</code></td><td>string</td><td><code>bottom-right</code></td><td><code>bottom-right</code> or <code>bottom-left</code></td></tr>
          <tr><td><code>data-presets</code></td><td>string</td><td><code>1, 5, 10</code></td><td>Comma-separated preset amounts (CKB)</td></tr>
          <tr><td><code>data-label</code></td><td>string</td><td><code>Tip</code></td><td>Button text label</td></tr>
          <tr><td><code>data-mode</code></td><td>string</td><td>(wallet)</td><td>Set to <code>qr</code> for QR code mode</td></tr>
          <tr><td><code>data-api</code></td><td>string</td><td><code>https://api.fibertap.dev</code></td><td>Custom API endpoint</td></tr>
        </tbody>
      </table>

      <h2 id="themes">Themes</h2>
      <p>The widget supports three theme modes. <code>auto</code> detects the user's system preference.</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="cmt">&lt;!-- Always dark --&gt;</span>
<span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_ADDRESS"</span>
  <span class="attr">data-theme</span>=<span class="str">"dark"</span>
<span class="tag">&gt;&lt;/script&gt;</span>

<span class="cmt">&lt;!-- Always light --&gt;</span>
<span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_ADDRESS"</span>
  <span class="attr">data-theme</span>=<span class="str">"light"</span>
<span class="tag">&gt;&lt;/script&gt;</span>

<span class="cmt">&lt;!-- Match system preference (default) --&gt;</span>
<span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_ADDRESS"</span>
  <span class="attr">data-theme</span>=<span class="str">"auto"</span>
<span class="tag">&gt;&lt;/script&gt;</span></code></pre>
      </div>

      <h2 id="position">Position</h2>
      <p>Place the widget on either side of the screen:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="cmt">&lt;!-- Bottom right (default) --&gt;</span>
<span class="tag">&lt;script</span> <span class="attr">data-position</span>=<span class="str">"bottom-right"</span> <span class="attr">src</span>=<span class="str">"...widget.min.js"</span> <span class="tag">&gt;&lt;/script&gt;</span>

<span class="cmt">&lt;!-- Bottom left --&gt;</span>
<span class="tag">&lt;script</span> <span class="attr">data-position</span>=<span class="str">"bottom-left"</span> <span class="attr">src</span>=<span class="str">"...widget.min.js"</span> <span class="tag">&gt;&lt;/script&gt;</span></code></pre>
      </div>

      <h2 id="custom-api">Custom API Endpoint</h2>
      <p>If you run your own FiberTap API server (or use the widget offline):</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_ADDRESS"</span>
  <span class="attr">data-api</span>=<span class="str">"https://your-api.example.com"</span>
<span class="tag">&gt;&lt;/script&gt;</span></code></pre>
      </div>

      <h2 id="manual-init">Manual Initialization</h2>
      <p>Initialize the widget programmatically instead of via a script tag:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="tag">&lt;script</span> <span class="attr">type</span>=<span class="str">"module"</span><span class="tag">&gt;</span>
  <span class="kw">import</span> { createWidget } <span class="kw">from</span> <span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>;

  <span class="fn">createWidget</span>({
    creator: <span class="str">"YOUR_ADDRESS"</span>,
    theme: <span class="str">"dark"</span>,
    position: <span class="str">"bottom-left"</span>,
    presets: [1, 5, 10, 25],
    label: <span class="str">"Support me"</span>,
  });
<span class="tag">&lt;/script&gt;</span></code></pre>
      </div>

      <div class="info-box note">
        \u2139\uFE0F <strong>Shadow DOM Isolation:</strong> The widget renders inside a Shadow DOM. Your page's CSS cannot affect the widget, and the widget's CSS cannot affect your page. This is by design.
      </div>

      <!-- Platform Guides -->
      <h2 id="wordpress">WordPress</h2>
      <p>Add the script to your theme's footer. Go to <strong>Appearance \u2192 Theme Editor \u2192 footer.php</strong> and paste before <code>&lt;/body&gt;</code>:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_CKB_ADDRESS"</span>
<span class="tag">&gt;&lt;/script&gt;</span></code></pre>
      </div>

      <div class="info-box tip">
        \u{1F4A1} <strong>Alternative:</strong> Install a "Code Injection" plugin and paste the snippet in the site-wide footer section. No theme editing required.
      </div>

      <h2 id="nextjs">Next.js</h2>
      <p>In <code>pages/_document.tsx</code> or <code>app/layout.tsx</code>:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="kw">import</span> Script <span class="kw">from</span> <span class="str">"next/script"</span>;

<span class="kw">export default function</span> <span class="fn">Layout</span>({ children }) {
  <span class="kw">return</span> (
    <span class="tag">&lt;html&gt;</span>
      <span class="tag">&lt;body&gt;</span>
        {children}
        <span class="tag">&lt;Script</span>
          <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
          <span class="attr">data-creator</span>=<span class="str">"YOUR_CKB_ADDRESS"</span>
          <span class="attr">strategy</span>=<span class="str">"lazyOnload"</span>
        <span class="tag">/&gt;</span>
      <span class="tag">&lt;/body&gt;</span>
    <span class="tag">&lt;/html&gt;</span>
  );
}</code></pre>
      </div>

      <h2 id="react">React / Vite</h2>
      <p>Create a component and use it anywhere in your app:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="kw">import</span> { useEffect, useRef } <span class="kw">from</span> <span class="str">"react"</span>;

<span class="kw">export function</span> <span class="fn">FiberTap</span>({ creator, theme = <span class="str">"auto"</span> }) {
  <span class="kw">const</span> loaded = <span class="fn">useRef</span>(<span class="str">false</span>);

  <span class="fn">useEffect</span>(() => {
    <span class="kw">if</span> (loaded.current) <span class="kw">return</span>;
    loaded.current = <span class="str">true</span>;

    <span class="kw">const</span> s = document.<span class="fn">createElement</span>(<span class="str">"script"</span>);
    s.src = <span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>;
    s.dataset.creator = creator;
    s.dataset.theme = theme;
    document.body.<span class="fn">appendChild</span>(s);
  }, [creator, theme]);

  <span class="kw">return null</span>;
}

<span class="cmt">// Usage: &lt;FiberTap creator="ckb1q..." theme="dark" /&gt;</span></code></pre>
      </div>

      <h2 id="ghost">Ghost / Substack</h2>
      <p>Go to <strong>Settings \u2192 Code injection \u2192 Site Footer</strong> and paste the script tag.</p>

      <h2 id="hugo">Hugo</h2>
      <p>In <code>layouts/_default/baseof.html</code>:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code>{{ define "scripts" }}
  <span class="tag">&lt;script</span>
    <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
    <span class="attr">data-creator</span>=<span class="str">"YOUR_CKB_ADDRESS"</span>
  <span class="tag">&gt;&lt;/script&gt;</span>
{{ end }}</code></pre>
      </div>

      <h2 id="github-pages">GitHub Pages</h2>
      <p>Add the script before <code>&lt;/body&gt;</code> in your layout template or individual pages:</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="cmt">&lt;!-- In _layouts/default.html or directly in pages --&gt;</span>
<span class="tag">&lt;script</span>
  <span class="attr">src</span>=<span class="str">"https://cdn.fibertap.dev/widget.min.js"</span>
  <span class="attr">data-creator</span>=<span class="str">"YOUR_CKB_ADDRESS"</span>
<span class="tag">&gt;&lt;/script&gt;</span></code></pre>
      </div>

      <h2 id="discord">Discord Bot Integration</h2>
      <p>Register a creator, set up webhooks, and listen for <code>payment.confirmed</code> events to verify tips in your Discord server.</p>

      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="cmt">// 1. Register as a creator</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">"https://api.fibertap.dev/api/creators/register"</span>, {
  method: <span class="str">"POST"</span>,
  headers: { <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span> },
  body: JSON.<span class="fn">stringify</span>({
    ckbAddress: <span class="str">"ckb1q..."</span>,
    displayName: <span class="str">"My Discord Bot"</span>,
  }),
});

<span class="cmt">// 2. Register webhook to receive payment events</span>
<span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">\`https://api.fibertap.dev/api/creators/\${id}/webhooks\`</span>, {
  method: <span class="str">"POST"</span>,
  headers: {
    <span class="str">"Content-Type"</span>: <span class="str">"application/json"</span>,
    <span class="str">"x-api-key"</span>: apiKey,
  },
  body: JSON.<span class="fn">stringify</span>({ url: <span class="str">"https://your-server.com/webhook"</span> }),
});</code></pre>
      </div>

      <!-- Advanced -->
      <h2 id="webhooks">Webhooks</h2>
      <p>Get notified when payments are confirmed. Register a webhook URL and receive POST requests with HMAC-SHA256 signatures.</p>

      <h3>Event Payload</h3>
      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code>{
  <span class="str">"type"</span>: <span class="str">"payment.confirmed"</span>,
  <span class="str">"paymentId"</span>: <span class="str">"ft_pay_xyz"</span>,
  <span class="str">"amount"</span>: <span class="str">"100000000"</span>,
  <span class="str">"senderAddress"</span>: <span class="str">"ckt1q..."</span>,
  <span class="str">"txHash"</span>: <span class="str">"0xabc..."</span>,
  <span class="str">"confirmedAt"</span>: 1700000000000,
  <span class="str">"message"</span>: <span class="str">"Great article!"</span>
}</code></pre>
      </div>

      <h3>Verify Signatures</h3>
      <div class="code-block">
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        <pre><code><span class="kw">import</span> crypto <span class="kw">from</span> <span class="str">"crypto"</span>;

<span class="kw">function</span> <span class="fn">verifyWebhook</span>(payload, signature, secret) {
  <span class="kw">const</span> expected = crypto
    .<span class="fn">createHmac</span>(<span class="str">"sha256"</span>, secret)
    .<span class="fn">update</span>(payload)
    .<span class="fn">digest</span>(<span class="str">"hex"</span>);

  <span class="kw">return</span> crypto.<span class="fn">timingSafeEqual</span>(
    Buffer.<span class="fn">from</span>(signature),
    Buffer.<span class="fn">from</span>(expected)
  );
}</code></pre>
      </div>

      <h2 id="api-ref">API Reference</h2>
      <p>Base URL: <code>https://api.fibertap.dev</code></p>

      <h3>Endpoints</h3>
      <table>
        <thead>
          <tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>POST</code></td><td><code>/api/creators/register</code></td><td>Public</td><td>Register a new creator</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/creators/:id</code></td><td>Public</td><td>Get creator profile</td></tr>
          <tr><td><code>PATCH</code></td><td><code>/api/creators/:id/config</code></td><td>API key</td><td>Update widget config</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/creators/:id/webhooks</code></td><td>API key</td><td>Register webhook</td></tr>
          <tr><td><code>DELETE</code></td><td><code>/api/creators/:id/webhooks/:whId</code></td><td>API key</td><td>Delete webhook</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/payments/request</code></td><td>Public</td><td>Create payment request</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/payments/:id/confirm</code></td><td>Public</td><td>Confirm payment</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/payments/:id/status</code></td><td>Public</td><td>Check payment status</td></tr>
          <tr><td><code>GET</code></td><td><code>/health</code></td><td>Public</td><td>Health check</td></tr>
        </tbody>
      </table>

      <h2 id="troubleshooting">Troubleshooting</h2>

      <h3>Widget doesn't appear</h3>
      <ul>
        <li>Check that the <code>data-creator</code> address is valid (starts with <code>ckb1q</code> or <code>ckt1q</code>)</li>
        <li>Open browser DevTools and check the console for errors</li>
        <li>Make sure the script URL is correct</li>
      </ul>

      <h3>Button appears but clicking does nothing</h3>
      <ul>
        <li>Verify your API server is running and reachable</li>
        <li>Check the <code>data-api</code> attribute points to a valid API URL</li>
        <li>Open DevTools Network tab to see if API calls are succeeding</li>
      </ul>

      <h3>Styling conflicts</h3>
      <p>The widget uses Shadow DOM isolation. If you see styling issues, it's likely a z-index conflict. The widget renders at <code>z-index: 2147483647</code> (max safe value).</p>

      <div class="info-box note">
        \u2139\uFE0F <strong>Browser Support:</strong> Chrome 90+, Firefox 90+, Safari 15+, Edge 90+. The widget requires Shadow DOM support.
      </div>

    </main>
  </div>

  <script>
    function copyCode(btn) {
      const pre = btn.parentElement.querySelector('pre');
      const text = pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    // Active sidebar link on scroll
    const sections = document.querySelectorAll('[id]');
    const links = document.querySelectorAll('.sidebar a');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const active = document.querySelector(\`.sidebar a[href="#\${entry.target.id}"]\`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach(s => observer.observe(s));
  </script>
</body>
</html>`;

// packages/api/src/vercel.ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
var config = loadConfig();
var useMongo = (process.env.NODE_ENV === "production" || process.env.USE_MONGO === "true") && !!process.env.MONGODB_URI;
var storage = useMongo ? createMongoStorage(config.mongoUri, config.mongoDb) : createMemoryStorage();
var app = new Hono2();
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "x-api-key"],
    maxAge: 86400
  })
);
app.use("/api/*", rateLimitMiddleware);
app.use("/api/*", createAuthMiddleware(storage));
app.route("/api/creators", createCreatorRoutes(storage));
app.route("/api/payments", createPaymentRoutes(storage));
app.get(
  "/health",
  (c) => c.json({
    status: "ok",
    storage: useMongo ? "mongodb" : "memory",
    network: config.network,
    timestamp: Date.now()
  })
);
app.get("/", (c) => c.html(LANDING_PAGE));
var widgetJs = "";
try {
  const widgetPath = resolve(
    process.cwd(),
    "packages/widget/dist/widget.min.js"
  );
  if (existsSync(widgetPath)) {
    widgetJs = readFileSync(widgetPath, "utf-8");
  }
} catch {
}
app.get("/widget.min.js", (c) => {
  if (!widgetJs) {
    return c.redirect("https://cdn.fibertap.dev/widget.min.js", 302);
  }
  return new Response(widgetJs, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*"
    }
  });
});
app.get("/docs", (c) => c.html(DOCS_PAGE));
app.get("/docs/*", (c) => c.html(DOCS_PAGE));
app.notFound((c) => c.json({ error: "Not found" }, 404));
var vercel_default = handle(app);
export {
  vercel_default as default
};
