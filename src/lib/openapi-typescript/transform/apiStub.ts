import _ from "lodash";
import {
  OpenAPI3,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBody,
  ResponseObject,
} from "openapi-typescript";
import { httpMethods } from "../../constants";
import { getRefObject, tsUnionOf } from "../utils";

function upperCamelCase(tag: string) {
  const ret = _.camelCase(tag);
  if (ret[0]) {
    return ret[0].toUpperCase() + ret.substr(1);
  }
  return ret;
}

export function getQsList(
  params: (ReferenceObject | ParameterObject)[] | undefined,
  schema: OpenAPI3
): PathItemObject[] {
  if (!params) return [];
  const list: PathItemObject[] = [];
  for (let p of params) {
    let item: ParameterObject = p as ParameterObject;
    if ("$ref" in p) {
      const refP = getRefObject<ParameterObject>(p.$ref, schema.components);
      item = refP;
    }
    if (item.in === "query") {
      list.push(item);
    }
  }
  return list;
}

export function getReqBody(reqBody: ReferenceObject | RequestBody | undefined, schema: OpenAPI3): RequestBody | null {
  if (!reqBody) return null;
  if ("$ref" in reqBody) {
    return getRefObject<RequestBody>(reqBody.$ref, schema.components);
  } else {
    return reqBody;
  }
}

type TagOpMap = Record<string, OperationObject[]>;

function getReqUnionTypes(op: OperationObject, schema: OpenAPI3): string[] {
  const fn = op.operationId as string;
  const qsList = getQsList(op.parameters, schema);

  const unionTypes: string[] = [];

  if (!_.isEmpty(qsList)) {
    const qsType = `operations["${fn}"]["parameters"]["query"]`;
    unionTypes.push(qsType);
  }
  const reqBody = getReqBody(op.requestBody, schema);

  if (reqBody) {
    const bodyType = `operations["${fn}"]["requestBody"]["content"]["application/json"]`;
    unionTypes.push(bodyType);
  }
  return unionTypes;
}

function transReqNs(tagOpMap: TagOpMap, schema: OpenAPI3) {
  const lines: string[] = [];
  for (const [tag, ops] of Object.entries(tagOpMap)) {
    const nsLines: string[] = [];
    for (let op of ops) {
      const fn = op.operationId as string;
      const typeName = upperCamelCase(fn);
      const unionTypes = getReqUnionTypes(op, schema);
      if (unionTypes && unionTypes.length > 0) {
        const refType = tsUnionOf(unionTypes);
        nsLines.push(`export type ${typeName} = ${refType}`);
      }
    }
    const ns = tag + "Req";
    lines.push(...wrapToNameSpaceLines(nsLines, ns));
  }
  const reqNsCode = lines.join("\n");
  return reqNsCode;
}

function wrapToNameSpaceLines(nsLines: string[], ns: string) {
  let lines: string[] = [];
  if (nsLines && nsLines.length > 0) {
    const fstLine = `\nexport namespace ${ns} {`;
    const lstLine = "}\n\n";
    lines = [fstLine, ...nsLines, lstLine];
  }
  return lines;
}

function isHas200JsonResponse(op: OperationObject, schema: OpenAPI3): boolean {
  if (!op.responses) return false;
  let response = op.responses["200"];
  if ("$ref" in response) {
    response = getRefObject(response.$ref, schema.components);
  }
  const deepGetKey = "content.application/json.schema.properties.data";
  const refObj = _.get(response, deepGetKey);
  return !!refObj;
}

function transResNs(tagNsMap: TagOpMap, schema: OpenAPI3) {
  const lines: string[] = [];
  for (const [tag, ops] of Object.entries(tagNsMap)) {
    const nsLines: string[] = [];
    for (let op of ops) {
      const fn = op.operationId as string;
      const refType = upperCamelCase(fn);
      const has200Json = isHas200JsonResponse(op, schema);
      if (has200Json) {
        const code = `export type ${refType} = operations["${fn}"]["responses"]["200"]["content"]["application/json"]["data"]`;
        nsLines.push(code);
      }
    }
    const ns = tag + "Res";
    lines.push(...wrapToNameSpaceLines(nsLines, ns));
  }
  const reqNsCode = lines.join("\n");
  return reqNsCode;
}

export function transApiStub(schema: OpenAPI3): string {
  let output = "";
  const paths = schema.paths;
  if (!paths) return "";
  const tagNsMap: TagOpMap = {};
  const apiStubLines: string[] = [];
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
      let parameters = "";

      const unionTypes = getReqUnionTypes(operation, schema)
      if (!_.isEmpty(unionTypes)) {
        parameters = `params: ${reqNs}.${refType}`;
      }

      let retType = "unknown";
      const has200Json = isHas200JsonResponse(operation, schema);
      if (has200Json) {
        retType = `${resNs}.${refType}`;
      }

      const code = `export async function ${fn}(${parameters}): Promise<${retType}> {\n\n}\n\n`;

      apiStubLines.push(code);

      if (tagNsMap[tag]) {
        tagNsMap[tag].push(operation);
      } else {
        tagNsMap[tag] = [operation];
      }
    }
  });

  // generate req namespace code
  const reqNsCode = transReqNs(tagNsMap, schema);
  output += reqNsCode;

  // generate res namespace code
  const resNsCode = transResNs(tagNsMap, schema);
  output += resNsCode;

  // generate api stub code
  const apiCode = apiStubLines.join("\n");
  output += apiCode;

  return output;
}
