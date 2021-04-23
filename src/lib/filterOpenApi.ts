import { OpenAPI3 } from "openapi-typescript";
import _ from "lodash";

export function cloneOpenApi(openApi: OpenAPI3): OpenAPI3 {
  return JSON.parse(JSON.stringify(openApi));
}

export function filterOpenApi(schema: OpenAPI3, grepRegex: string): OpenAPI3 {
  if (!grepRegex) return schema;
  const regex = new RegExp(grepRegex);
  const checkPathMatch = (p: string) => regex.test(p);
  if (schema.paths) {
    const paths = filterRecord(schema.paths, checkPathMatch);
    const newSchema = cloneOpenApi(schema);
    newSchema.paths = paths;
    const components = newSchema.components;
    if (components) {
      const refs = getAllRefs(paths, components);
      const newComp = rebuildComponents(components, refs);
      newSchema.components = newComp;
    }
    return newSchema;
  } else {
    return schema;
  }
}

function filterRecord<V>(record: Record<string, V>, predict: (e: string) => boolean): Record<string, V> {
  const keys = Object.keys(record).filter(predict);
  return keys.reduce((ret, k) => {
    ret[k] = record[k];
    return ret;
  }, {} as Record<string, V>);
}

function getAllRefs(openApi: object, components: OpenAPI3["components"]) {
  const allRefs: string[] = [];

  function walk(obj: any) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    } else if (_.isArray(obj)) {
      for (let e of obj) {
        walk(e);
      }
    } else {
      for (let key of Object.keys(obj)) {
        if (key == "$ref") {
          const refKey = obj[key].replace("#/components/", "").replace(/\//g, ".");
          allRefs.push(refKey);
          const refObj = _.get(components, refKey);
          if (refObj) {
            walk(refObj);
          }
        }
        walk(obj[key]);
      }
    }
  }
  walk(openApi);
  return allRefs;
}

export function rebuildComponents(components: OpenAPI3["components"], refKeys: string[]): OpenAPI3["components"] {
  const result = {};
  console.log({ refKeys, result, components }, "xddd");
  for (let path of refKeys) {
    _.set(result, path, _.get(components, path));
  }
  return result;
}
