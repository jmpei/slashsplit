"use client";
// Swagger UI (#8) for /api/openapi.json, loaded from a pinned swagger-ui-dist build on unpkg with
// subresource integrity, so the docs page needs no npm dependency.
import Script from "next/script";

const dist = "https://unpkg.com/swagger-ui-dist@5.34.1";

type SwaggerWindow = Window & {
  SwaggerUIBundle?: (config: { url: string; dom_id: string }) => unknown;
};

export function SwaggerUi() {
  return (
    <>
      <link
        rel="stylesheet"
        href={`${dist}/swagger-ui.css`}
        integrity="sha384-4c3vsE5f+trhFyHrFrLM1fFGUn531NIaC7dcqEWIJdoRQJ5CkJbSuSCwXLpaS1KF"
        crossOrigin="anonymous"
        precedence="default"
      />
      <Script
        src={`${dist}/swagger-ui-bundle.js`}
        integrity="sha384-XFYN47VzPiDY6qPtxYKg0nqUeW/upo20xf1j2SUE7gT/i35FJB4cuS/71Iegzk8Z"
        crossOrigin="anonymous"
        onReady={() => {
          (window as SwaggerWindow).SwaggerUIBundle?.({
            url: "/api/openapi.json",
            dom_id: "#swagger-ui",
          });
        }}
      />
      <div id="swagger-ui" />
    </>
  );
}
