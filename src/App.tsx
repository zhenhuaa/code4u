import "./App.css";
import { ToolBar } from "./toolBar";
import { InputPanel, OutPutPanel } from "./panels";
import { useState } from "react";
import swaggerToTS from "openapi-typescript";
import { tinyCorrect } from "./lib/standardOpenApi";
import { OpenApiSchema } from "./lib/types";

function App() {
  const [spec, setSpec] = useState("");
  const [genCode, setGenCode] = useState("");

  function updateTsCode(schema: OpenApiSchema) {
    schema = tinyCorrect(schema);
    const tsCode = swaggerToTS(schema, { version: 3 });
    setGenCode(tsCode);
  }

  function useGenCode(schema: OpenApiSchema) {
    const specCode = JSON.stringify(schema, null, 2);
    setSpec(specCode);
    updateTsCode(schema);
    return "";
  }

  return (
    <div className="playground-container">
      <ToolBar useGenCode={useGenCode}></ToolBar>
      <div className="editors-container">
        <div className="editors">
          <InputPanel value={spec} useGenCode={useGenCode}></InputPanel>
          <OutPutPanel value={genCode}></OutPutPanel>
        </div>
      </div>
    </div>
  );
}

export default App;
