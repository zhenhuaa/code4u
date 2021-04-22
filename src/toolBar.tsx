import { ChangeEvent, useEffect, useState } from "react";
import type { OpenAPI3 } from "openapi-typescript";

interface ToolBarProps {
  useGenCode: (schema: OpenAPI3) => void;
}

export function ToolBar(props: ToolBarProps) {
  const defaultSpecUrl = "http://local.dev.163.com:8881/docs/qn/swagger.json";
  const [specUrl, setSpecUrl] = useState("");

  useEffect(() => {
    setSpecUrl(defaultSpecUrl);
    fetchApiJsonData(defaultSpecUrl);
  }, []);

  function updateEditors(schema: OpenAPI3) {
    props.useGenCode(schema);
  }

  async function fetchApiJsonData(specUrl: string) {
    if (specUrl && specUrl.endsWith(".json")) {
      console.log("should fetch json data");
      const res = await fetch(specUrl);
      const json: OpenAPI3 = await res.json();
      updateEditors(json);
    } else {
      console.debug("should do nothing");
    }
  }

  function onSpecUrlChange(event: ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    setSpecUrl(newValue);
    fetchApiJsonData(newValue);
  }

  return (
    <nav className="navbar">
      <div className="toolbar">
        <div className="spec-url">
          <input
            placeholder="Url to spec to try"
            value={specUrl}
            onChange={onSpecUrlChange}
          />
        </div>
      </div>
    </nav>
  );
}

function useGenCode(schema: OpenAPI3) {
  throw new Error("Function not implemented.");
}
