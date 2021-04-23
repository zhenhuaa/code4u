import "./toolBar.css";
import { useEffect, useState } from "react";
import { filterOpenApi } from "./lib/filterOpenApi";
import { OpenApiSchema } from "./lib/types";
import { useDebounce } from "use-debounce";
import { debounceTime } from "./lib/constants";

interface ToolBarProps {
  useGenCode: (schema: OpenApiSchema) => void;
}

export function ToolBar(props: ToolBarProps) {
  const defaultSpecUrl = "http://local.dev.163.com:8881/docs/l10/swagger.json";
  const [specUrl, setSpecUrl] = useState(defaultSpecUrl);
  const [grepRe, setRe] = useState("");
  const [fullSchema, setFullSchema] = useState<OpenApiSchema | null>(null);
  const [grepReDep] = useDebounce(grepRe, debounceTime);
  const [specUrlDep] = useDebounce(specUrl, debounceTime);

  useEffect(() => {
    if (fullSchema) {
      updateEditors(fullSchema, grepReDep);
    }
  });

  useEffect(() => {
    fetchApiJsonData(specUrlDep);
  }, [specUrlDep]);

  function updateEditors(schema: OpenApiSchema, re: string) {
    if (re) {
      const newSchema = filterOpenApi(schema, re);
      props.useGenCode(newSchema);
    } else {
      props.useGenCode(schema);
    }
  }

  useEffect(() => {
    if (fullSchema) {
      updateEditors(fullSchema, grepReDep);
    }
  }, [grepReDep]);

  async function fetchApiJsonData(specUrl: string) {
    if (specUrl && specUrl.endsWith(".json")) {
      const res = await fetch(specUrl);
      const json: OpenApiSchema = await res.json();
      setFullSchema(json);
    } else {
      console.debug("should do nothing");
    }
  }

  return (
    <nav className="navbar">
      <div className="toolbar">
        <div className="spec-url">
          <label>SpecUrl: </label>
          <input placeholder="Url to spec to try" value={specUrl} onChange={(e) => setSpecUrl(e.target.value)} />
        </div>
        <div className="grep-regex">
          <label>GrepOption: </label>
          <input placeholder="grep regex for filter path" value={grepRe} onChange={(e) => setRe(e.target.value)} />
        </div>
      </div>
    </nav>
  );
}
