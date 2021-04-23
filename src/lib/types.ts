import { OpenAPI3 } from "openapi-typescript";

export interface Tag {
  name: string;
  description: string;
}

export interface ServerInfo {
  url: string;
  description: string;
}

export interface OpenApiSchema extends OpenAPI3 {
  tags: Tag[];
  servers: ServerInfo[];
}
