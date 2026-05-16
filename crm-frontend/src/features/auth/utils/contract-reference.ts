/**
 * Rutas del contrato publico respecto al origen configurado en `VITE_API_BASE_URL`.
 * Este proyecto solo depende del API Gateway publicado; no importa codigo de otros repos.
 */
export const gatewayContractPaths = {
  openApiYaml: '/openapi.yaml',
  swaggerUi: '/docs',
} as const
