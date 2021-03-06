import _ from "lodash";
import { httpMethods } from "./constants";
import { OpenApiSchema } from "./types";

export function tinyCorrect(schema: OpenApiSchema) {
  const paths = schema.paths;
  _.each(paths, (p, pathKey) => {
    const methodsNum = Object.keys(p).length
    for (let m of httpMethods) {
      const desc = p[m]?.description;
      const summary = p[m]?.summary;
      let operationId = p[m]?.operationId;
      if (summary && !desc) {
        // set api description when only exist summary
        _.set(p, m + ".description", summary);
      }

      if (p[m]) {
        if (!operationId) {
          // auto set operationId by path and http method
          let prefix = ''
          if(methodsNum > 1) {
            prefix = m
          }
          operationId = (prefix  + pathKey).replace(/\//g, "_");
        }
        _.set(p, m + ".operationId", _.camelCase(operationId));
      }
    }
  });

  return schema;
}
