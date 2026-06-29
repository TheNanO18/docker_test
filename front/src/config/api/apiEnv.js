const rawApiBase = process.env.REACT_APP_API_BASE_URL || "";
const rawWsBase = process.env.REACT_APP_WS_BASE_URL || "";

const isHttpsPage =
  typeof window !== "undefined" && window.location.protocol === "https:";

const wouldCauseMixedContent = (url) => isHttpsPage && url.startsWith("http://");

export const API_BASE = isHttpsPage && (!rawApiBase || wouldCauseMixedContent(rawApiBase))
  ? "/api/proxy?path="
  : rawApiBase.replace(/\/$/, "");

export const WS_BASE_URL = rawWsBase.replace(/\/$/, "");
export const WS_BASE = WS_BASE_URL;
export const WS_ENABLED =
  Boolean(WS_BASE_URL) && !(isHttpsPage && WS_BASE_URL.startsWith("ws://"));
