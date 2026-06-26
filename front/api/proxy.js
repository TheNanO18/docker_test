const BACKEND_BASE_URL = "http://134.185.112.214";

module.exports = async function handler(req, res) {
  const path = getPath(req);
  const targetUrl = `${BACKEND_BASE_URL}/api/${withTrailingSlash(path)}${buildQueryString(req.query)}`;

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

function getPath(req) {
  const path = req.query.path;
  if (Array.isArray(path)) return path.join("/");
  return path || "";
}

function withTrailingSlash(path) {
  if (!path || path.endsWith("/")) return path;
  return `${path}/`;
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
  return queryString ? `?${queryString}` : "";
}
