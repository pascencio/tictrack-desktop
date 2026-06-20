---
name: design-verify
description: Verifica visualmente cambios de UI con agent-browser tras implementar diseño, componentes shadcn, Tailwind o pantallas nuevas. Ejecuta automáticamente al terminar desarrollo frontend, ajustes de tema/colores, integración de diseños Stitch, o cuando el usuario pida revisar que el diseño se vea bien. No esperes a que el usuario repita el prompt de prueba — corre el flujo completo, reporta hallazgos y corrige problemas obvios antes de dar por terminado el trabajo.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*), Bash(pnpm:*), Bash(curl:*), Bash(kill:*)
---

# design-verify

Verificación visual automatizada de la UI de TicTrack con **agent-browser**.
Complementa la skill `agent-browser` (CLI base). Si no conoces los comandos del
CLI, ejecuta primero:

```bash
agent-browser skills get core
```

## Cuándo ejecutar (obligatorio)

Corre este flujo **sin que el usuario lo pida** cuando hayas hecho cualquiera de:

- Cambios en componentes Vue, layouts o páginas
- Ajustes en `app/assets/css/tailwind.css`, tokens de tema o variables shadcn
- Nuevos componentes shadcn o estilos Tailwind
- Implementación o actualización de diseños desde Stitch MCP
- Cualquier tarea donde el entregable incluya UI visible

**No des por terminado el desarrollo frontend** hasta completar al menos una
verificación exitosa o documentar por qué no fue posible (servidor caído, etc.).

## Prerrequisitos

```bash
# Instalar agent-browser si no está disponible
npm i -g agent-browser && agent-browser install
```

## Configuración del proyecto

| Parámetro | Valor por defecto |
|-----------|-------------------|
| URL dev | `http://localhost:3000` |
| Comando dev | `pnpm dev` |
| Puerto | `3000` (ver `nuxt.config.ts`) |
| Tema | Dark-first (`class="dark"` en `<html>`) |
| Screenshots | `.tmp/design-verify.png` (sobrescribir en cada corrida) |

Si implementaste otra ruta (p. ej. `/settings`), abre esa URL en lugar de `/`.

## Flujo de verificación

### 1. Asegurar que el dev server responde

```bash
# Comprobar si ya hay servidor en el puerto
curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000
```

- Si responde **200** o el HTML de la app → continuar.
- Si falla o muestra página de error de Nuxt → reiniciar:

```bash
# Matar instancia previa si está rota (ajusta PID si hace falta)
pkill -f "nuxt dev" 2>/dev/null || true
cd <project-root> && NUXT_IGNORE_LOCK=1 pnpm dev &
sleep 5
curl -sf http://localhost:3000 > /dev/null
```

Espera a que Vite termine de compilar antes de abrir el browser.

### 2. Abrir la app y capturar estado

```bash
agent-browser close --all 2>/dev/null || true
agent-browser open http://localhost:3000
agent-browser wait 3000
agent-browser get title
agent-browser screenshot .tmp/design-verify.png
agent-browser snapshot -i -c -d 3
```

Para rutas específicas: `agent-browser open http://localhost:3000/ruta`.

### 3. Detectar fallos inmediatos

**Detener y corregir** si ocurre alguno de:

| Señal | Acción |
|-------|--------|
| Título contiene "Error", "TypeError" | Revisar terminal dev, dependencias, reiniciar servidor |
| Snapshot vacío o solo DevTools | Esperar más (`agent-browser wait 5000`) y reintentar |
| Pantalla en blanco | Verificar errores de build (`pnpm build`) |
| CDP timeout | Reintentar una vez; si persiste, reportar al usuario |

### 4. Checklist visual (TicTrack V2)

Compara screenshot + snapshot contra la skill **`design-system`** (paleta Stitch,
tokens shadcn, patrones de componentes). Resumen mínimo:

**Layout global**
- [ ] Sidebar fija a la izquierda (~240px) con logo + "TicTrack"
- [ ] Logo usa `/tauri.svg` (placeholder hasta logo final de Stitch)
- [ ] Fondo oscuro `#051424`, texto claro legible
- [ ] Tipografías: Montserrat (títulos), Inter (cuerpo), JetBrains Mono (timer)

**Dashboard (`/`)**
- [ ] Header sticky con título de sección y toggle Pomodoro
- [ ] Sección timer activo: anillo de progreso, tiempo grande con glow
- [ ] Botones Pausa / Completar visibles
- [ ] Grid "Tareas de Hoy" con tarjetas (activa, overtime, completada, añadir)
- [ ] FAB circular (rayo) abajo a la derecha

**Componentes shadcn**
- [ ] Botones, badges, progress y switch usan tokens CSS (no colores hardcodeados fuera de tema)
- [ ] Bordes y glass-card con transparencia coherente con el diseño Stitch

**Responsive (opcional, si cambiaste layout)**
```bash
agent-browser set viewport 1280 1024
agent-browser screenshot .tmp/design-verify-desktop.png
agent-browser set viewport 768 1024
agent-browser screenshot .tmp/design-verify-tablet.png
```

### 5. Cerrar sesión

```bash
agent-browser close --all
```

## Formato del reporte al usuario

Al terminar, incluye siempre:

```markdown
## Verificación de diseño

**URL:** http://localhost:3000
**Estado:** ✅ OK | ⚠️ Parcial | ❌ Falló

### Elementos verificados
- [lista de checks pasados]

### Problemas encontrados
- [problema] → [acción tomada o pendiente]

### Screenshot
Referencia guardada en `.tmp/design-verify.png`
```

Si encontraste problemas **corrígelos y vuelve a ejecutar** el flujo (máx. 2
iteraciones) antes de reportar al usuario.

## Comparar con Stitch (opcional)

Si el cambio proviene de un diseño Stitch:

1. Obtener screenshot de referencia vía MCP Stitch (`get_screen` → URL screenshot).
2. Comparar layout, jerarquía tipográfica, colores y espaciado.
3. Documentar desviaciones intencionales (p. ej. logo Tauri temporal).

## Troubleshooting

| Problema | Solución |
|----------|----------|
| `Another Nuxt dev server is already running` | `NUXT_IGNORE_LOCK=1 pnpm dev` o matar PID indicado |
| `Could not load @nuxtjs/tailwindcss` | Servidor viejo roto → reiniciar tras `pnpm install` |
| Screenshot muestra error Nuxt | No usar screenshot de servidor caído; reiniciar dev |
| Puerto 3000 ocupado | Verificar `nuxt.config.ts` o usar el puerto configurado |
| agent-browser no instalado | `npm i -g agent-browser && agent-browser install` |

## Integración con otras skills

- **`agent-browser`**: CLI base; carga `skills get core` para comandos avanzados.
- **`design-system`**: Paleta Stitch, tokens, variantes y reglas shadcn/Tailwind — consultar al implementar UI.
- **`openspec-apply-change`**: Tras implementar tareas UI, corre design-verify antes de marcar tarea completa.
