const BACKEND_BASE_URL = "http://134.185.112.214";

module.exports = async function handler(req, res) {
  const targetUrl = `${BACKEND_BASE_URL}${buildBackendPath(req)}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers["x-forwarded-host"];
  delete headers["x-forwarded-proto"];
  delete headers["x-vercel-id"];
  delete headers["content-length"];

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
      redirect: "manual",
    });

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-encoding") {
        res.setHeader(key, value);
      }
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status).send(buffer);
  } catch (error) {
    res.status(502).json({
      error: "Backend proxy failed",
      message: error.message,
    });
  }
};

function buildBackendPath(req) {
  const rawPath = Array.isArray(req.query.path)
    ? req.query.path.join("/")
    : req.query.path || "";
  const path = rawPath.startsWith("/") ? rawPath : `/api/${rawPath}`;
  const [pathname, queryString = ""] = path.split("?");
  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const extraQueryString = buildQueryString(req.query);
  const joinedQueryString = [queryString, extraQueryString]
    .filter(Boolean)
    .join("&");

  return joinedQueryString ? `${normalizedPath}?${joinedQueryString}` : normalizedPath;
}

function buildQueryString(query) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (key === "path") return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    if (value !== undefined) {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  return queryString;
}
