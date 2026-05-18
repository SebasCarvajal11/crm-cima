# Monorepo Legacy - CIMA CRM

Este repositorio ya no debe usarse como punto principal de arranque o integracion local.

La migracion tecnica a multi-repo ya fue validada y el entorno activo pasa a ser:

- [crm-infra](D:\BACKUP CELULAR OLIMPO\crm-infra\README.md)
- `D:\BACKUP CELULAR OLIMPO\crm-auth`
- `D:\BACKUP CELULAR OLIMPO\crm-collab`
- `D:\BACKUP CELULAR OLIMPO\crm-media`
- `D:\BACKUP CELULAR OLIMPO\crm-frontend`

## Punto de entrada correcto

Para levantar y verificar el stack separado usa:

```powershell
cd "D:\BACKUP CELULAR OLIMPO\crm-infra"
pnpm verify:multirepo
pnpm verify:frontend-ui
```

## Estado de este repo

- `legacy`
- no usar como referencia principal para integracion diaria
- conservar temporalmente solo como historial y apoyo de migracion

## Siguiente accion operativa

Congelar este monorepo como solo lectura o archivarlo cuando el equipo confirme el cambio operativo definitivo.
