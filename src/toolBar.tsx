import "./toolBar.css";
import { ChangeEvent, useEffect, useState } from "react";
import { debounce } from "./helper";
import { filterOpenApi } from "./lib/filterOpenApi";
import { OpenApiSchema } from "./lib/types";

interface ToolBarProps {
  useGenCode: (schema: OpenApiSchema) => void;
}

export function ToolBar(props: ToolBarProps) {
  const defaultSpecUrl = "http://local.dev.163.com:8881/docs/l10/swagger.json";
  const [specUrl, setSpecUrl] = useState("");
  const [grepRegex, setGrepRegex] = useState("");
  const [fullSchema, setFullSchema] = useState<OpenApiSchema | null>(null);

  useEffect(() => {
    setSpecUrl(defaultSpecUrl);
    fetchApiJsonData(defaultSpecUrl);
  }, []);

  function updateEditors(schema: OpenApiSchema) {
    if(grepRegex) {
      const newSchema = filterOpenApi(schema, grepRegex);
      props.useGenCode(newSchema);
    } else {
      console.log({schema, fullSchema}, "updateEditorsRestoreSchema")
      props.useGenCode(schema);
    }
  }

  async function fetchApiJsonData(specUrl: string) {
    if (specUrl && specUrl.endsWith(".json")) {
      const res = await fetch(specUrl);
      const json: OpenApiSchema = await res.json();
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
    console.log({re, fullSchema}, 'onGrepChange')
    if (fullSchema) {
      updateEditors(fullSchema);
    }
  }

  return (
    <nav className="navbar">
      <div className="toolbar">
        <div className="spec-url">
          <label>SpecUrl: </label>
          <input placeholder="Url to spec to try" value={specUrl} onChange={onSpecUrlChange} />
        </div>
        <div className="grep-regex">
          <label>GrepOption: </label>
          <input placeholder="grep regex for filter path" value={grepRegex} onChange={onGrepChange} />
        </div>
      </div>
    </nav>
  );
}
