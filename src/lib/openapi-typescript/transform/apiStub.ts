import _ from "lodash";
import { PathItemObject } from "openapi-typescript";
import { httpMethods } from "../../constants";

function upperCamelCase(tag: string) {
  const ret = _.camelCase(tag);
  if(ret[0]) {
    return ret[0].toUpperCase() + ret.substr(1)
  }
  return ret;
}

export function transApiStub(paths: Record<string, PathItemObject>): string {
  let output = "";
  Object.entries(paths).forEach(([url, pathItem]) => {
    for (let m of httpMethods) {
      const operation = pathItem[m];
      if (!operation) return;
      let tag = "";
      if (operation.tags) {
        tag = operation.tags[0];
      }
      tag = upperCamelCase(tag);
      const fn = operation.operationId;
      if (!fn) return;
      const refType = upperCamelCase(fn)
      const code = `export async function ${fn}(params: ${tag}Req.${refType}): Promise<${tag}Res.${refType}> {\n\n}\n\n`;
      console.log(code);
      output += code;
    }
  });
  return output;
}
