import "./toolBar.css";
import { ChangeEvent, useEffect, useState } from "react";
import type { OpenAPI3 } from "openapi-typescript";
import { debounce } from "./helper";
import { filterOpenApi } from "./lib/filterOpenApi";

interface ToolBarProps {
  useGenCode: (schema: OpenAPI3) => void;
}

export function ToolBar(props: ToolBarProps) {
  const defaultSpecUrl =
    "http://local.dev.163.com:8881/docs/l10/swagger.json";
  const [specUrl, setSpecUrl] = useState("");
  const [grepRegex, setGrepRegex] = useState("");
  const [fullSchema, setFullSchema] = useState<OpenAPI3 | null>(null);

  useEffect(() => {
    setSpecUrl(defaultSpecUrl);
    fetchApiJsonData(defaultSpecUrl);
  }, []);

  function updateEditors(schema: OpenAPI3) {
    props.useGenCode(schema);
  }

  async function fetchApiJsonData(specUrl: string) {
    if (specUrl && specUrl.endsWith(".json")) {
      const res = await fetch(specUrl);
      const json: OpenAPI3 = await res.json();
      setFullSchema(json);
      updateEditors(json);
    } else {
      console.debug("should do nothing");
    }
  }

  const fetchApiJsonDataOnChange = debounce(fetchApiJsonData, 500);

  function onSpecUrlChange(event: ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    setSpecUrl(newValue);
    fetchApiJsonDataOnChange(newValue);
  }

  function onGrepChange(event: ChangeEvent<HTMLInputElement>) {
    const re = event.target.value;
    setGrepRegex(re);
    if (fullSchema) {
      const newSchema = filterOpenApi(fullSchema, re);
      updateEditors(newSchema);
    }
  }

  return (
    <nav className="navbar">
      <div className="toolbar">
        <div className="spec-url">
          <label>SpecUrl: </label>
          <input
            placeholder="Url to spec to try"
            value={specUrl}
            onChange={onSpecUrlChange}
          />
        </div>
        <div className="grep-regex">
          <label>GrepOption: </label>
          <input
            placeholder="grep regex for filter path"
            value={grepRegex}
            onChange={onGrepChange}
          />
        </div>
      </div>
    </nav>
  );
}
