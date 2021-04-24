import "./toolBar.css";
import { useEffect, useState } from "react";
import { filterOpenApi } from "./lib/filterOpenApi";
import { OpenApiSchema } from "./lib/types";
import { useDebounce } from "use-debounce";
import { debounceTime, exampleSpecUrl } from "./lib/constants";
import { useAsyncMemo } from "./helper";
import { tinyCorrect } from "./lib/autoFixOpenApi";

interface ToolBarProps {
  setInput: (code: string) => void;
}

export function ToolBar(props: ToolBarProps) {
  const [specUrl, setSpecUrl] = useState(exampleSpecUrl);
  const [grepRe, setRe] = useState("");
  const [grepReDep] = useDebounce(grepRe, debounceTime);
  const [specUrlDep] = useDebounce(specUrl, debounceTime);

  const fullSchema = useAsyncMemo(
    async () => {
      if (specUrlDep && specUrlDep.endsWith(".json")) {
        const res = await fetch(specUrl);
        const json: OpenApiSchema = await res.json();
        if (json && json.openapi) {
          const schema = tinyCorrect(json);
          return schema;
        }
        return null;
      } else {
        return null;
      }
    },
    [specUrlDep],
    null
  );

  useEffect(() => {
    if (fullSchema) {
      updateEditors(fullSchema, grepReDep);
    }
  }, [grepReDep, fullSchema]);

  function setInput(schema: OpenApiSchema) {
    const code = schema2Code(schema);
    props.setInput(code);
  }

  function schema2Code(schema: object): string {
    const specCode = JSON.stringify(schema, null, 2);
    return specCode;
  }

  function updateEditors(schema: OpenApiSchema, re: string) {
    if (re) {
      schema = filterOpenApi(schema, re);
    }
    setInput(schema);
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
