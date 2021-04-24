import _ from "lodash";
import { PathItemObject } from "openapi-typescript";
import { httpMethods } from "../../constants";

function upperCamelCase(tag: string) {
  const ret = _.camelCase(tag);
  if (ret[0]) {
    return ret[0].toUpperCase() + ret.substr(1);
  }
  return ret;
}

type ReqNsMap = Record<string, string[]>;
type ResNsMap = Record<string, string[]>;

function transReqNs(reqNsMap: ReqNsMap) {
  const lines = [];
  for (const [key, ops] of Object.entries(reqNsMap)) {
    lines.push(`export namespace ${key} {`);
    for (let op of ops) {
      const refType = upperCamelCase(op);
      lines.push(`export type ${refType} = operations["${op}"]["parameters"]["query"]`);
    }
    lines.push("}\n");
  }
  const reqNsCode = lines.join("\n");
  return reqNsCode
}



function transResNs(resNsMap: ResNsMap) {
  const lines = [];
  for (const [key, ops] of Object.entries(resNsMap)) {
    lines.push(`export namespace ${key} {`);
    for (let op of ops) {
      const refType = upperCamelCase(op);
      lines.push(`export type ${refType} = operations["${op}"]["responses"]["200"]["content"]["application/json"]["data"]`);
    }
    lines.push("}\n");
  }
  const reqNsCode = lines.join("\n");
  return reqNsCode
}


export function transApiStub(paths: Record<string, PathItemObject>): string {
  let output = "";
  const reqNsMap: ReqNsMap = {};
  const resNsMap: ResNsMap = {};
  const apiStubLines: string[] = []
  Object.entries(paths).forEach(([url, pathItem]) => {
    for (let m of httpMethods) {
      const operation = pathItem[m];
      if (!operation) continue;
      let tag = "";
      if (operation.tags) {
        tag = operation.tags[0];
      }
      tag = upperCamelCase(tag);
      const reqNs = `${tag}Req`;
      const resNs = `${tag}Res`;
      const fn = operation.operationId;
      if (!fn) continue;
      const refType = upperCamelCase(fn);
      const code = `export async function ${fn}(params: ${reqNs}.${refType}): Promise<${resNs}.${refType}> {\n\n}\n\n`;
      apiStubLines.push(code)

      if (reqNsMap[reqNs]) {
        reqNsMap[reqNs].push(fn);
      } else {
        reqNsMap[reqNs] = [fn];
      }

      if (resNsMap[reqNs]) {
        resNsMap[resNs].push(fn);
      } else {
        resNsMap[resNs] = [fn];
      }
    }
  });

  // generate req namespace code
  const reqNsCode = transReqNs(reqNsMap)
  output += reqNsCode;

  // generate res namespace code
  const resNsCode = transResNs(resNsMap)
  output += resNsCode;


  // generate api stub code
  const apiCode = apiStubLines.join('\n')
  output += apiCode


  return output;
}
