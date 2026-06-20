---
name: design-system
description: Reglas obligatorias del design system TicTrack V2 (Stitch "Deep Focus Productivity"). Usar al implementar o modificar UI, temas, colores, tipografía, componentes shadcn, Tailwind o pantallas desde Stitch. Define paleta, variantes de color, mapeo a tokens CSS, patrones de componentes y anti-patrones. Carga automáticamente en cualquier tarea frontend para que el agente no invente colores ni rompa el tema dark-first.
---

# design-system

Design system oficial de **TicTrack V2**, definido en Stitch (proyecto
`projects/2252590039974355909`, nombre *Deep Focus Productivity*).

**Fuente de verdad (en orden de prioridad):**

1. `app/assets/css/tailwind.css` — tokens implementados
2. Esta skill — reglas de uso y mapeo
3. Stitch MCP `get_project` → `designTheme.designMd` — referencia original

No introduzcas colores hex sueltos en componentes. Usa tokens semánticos.

## Principios

- **Dark-first:** la app es oscura por defecto (`class="dark"` en `<html>`).
  No implementes light mode salvo petición explícita.
- **Calm Control:** UI expansiva, capas tonales, sin sombras pesadas.
- **Glassmorphism sutil:** tarjetas con transparencia + blur, bordes al 5% blanco.
- **Precisión técnica:** timer y datos en monoespaciada; títulos geométricos.

## Paleta Stitch → tokens CSS → Tailwind

### Superficies (capas tonales)

Usa la escala de contenedores para jerarquía de profundidad, de más oscuro a más claro:

| Rol Stitch | CSS variable | Clase Tailwind | Hex |
|------------|--------------|----------------|-----|
| Fondo app | `--background` | `bg-background` | `#051424` |
| Sidebar / rail | `--sidebar` / `--surface-container-lowest` | `bg-sidebar` / `bg-surface-container-lowest` | `#010f1f` |
| Superficie baja | `--surface-container-low` | `bg-surface-container-low` | `#0d1c2d` |
| Cards / paneles | `--card` / `--surface-container` | `bg-card` / `bg-surface-container` | `#122131` |
| Elevación media | `--surface-container-high` | `bg-surface-container-high` | `#1c2b3c` |
| Elevación alta | `--surface-container-highest` / `--muted` | `bg-surface-container-highest` / `bg-muted` | `#273647` |
| Variante surface | `--surface-variant` | `bg-surface-variant` | `#273647` |

**Texto sobre superficies:**

| Rol | Token | Clase | Hex |
|-----|-------|-------|-----|
| Texto principal | `--foreground` | `text-foreground` | `#d4e4fa` |
| Texto secundario | `--muted-foreground` | `text-muted-foreground` | `#c7c4d7` |
| Bordes | `--border` / `--outline-variant` | `border-border` / `border-outline-variant` | `#464554` |
| Outline suave | `--ring` | `ring-ring` | `#8083ff` |

### Colores de marca

| Rol | Token shadcn | Clase bg | Clase text | Hex |
|-----|--------------|----------|------------|-----|
| Primary (lavanda) | `--primary` | `bg-primary` | `text-primary` | `#c0c1ff` |
| On primary | `--primary-foreground` | — | `text-primary-foreground` | `#1000a9` |
| Primary container (CTA) | `--primary-container` | `bg-primary-container` | `text-on-primary-container` | `#8083ff` / `#e1e0ff` |
| Secondary (cielo) | `--secondary` | `bg-secondary` | `text-secondary` | `#89ceff` |
| Secondary container | `--secondary-container` | `bg-secondary-container/20` | `text-secondary` | `#00a2e6` |
| Tertiary (naranja) | `--tertiary` | `bg-tertiary` | `text-tertiary` | `#ffb783` |
| Tertiary container | `--tertiary-container` | `bg-tertiary-container/20` | `text-tertiary` | `#d97721` |
| Destructive / error | `--destructive` | `bg-destructive` | `text-destructive` | `#ffb4ab` |

### Estados semánticos (uso estricto)

| Estado | Color | Cuándo usar |
|--------|-------|-------------|
| **Completo** | Verde (reservar; aún no en tokens — usar `text-primary` + opacidad 0.5 + line-through) | Tareas terminadas |
| **Pausa / en espera** | `--tertiary` / naranja | Pomodoro pausado, "on hold" |
| **Overtime / error** | `--destructive` | Presupuesto superado, alertas |
| **Activo / foco** | `--primary` + glow 20% | Timer corriendo, nav activa |
| **Progreso normal** | `--primary` en barras | Progress bars estándar |

No uses rojo para acciones primarias ni verde para warnings.

## Tema shadcn + Tailwind v4

### Reglas de tokens

1. **Todos los colores viven en** `app/assets/css/tailwind.css` bajo `:root, .dark`.
2. **Nunca** uses `#051424`, `#c0c1ff`, etc. en archivos `.vue` — usa clases semánticas.
3. Excepción permitida: utilidades globales en `@layer utilities` (`.glass-card`, `.timer-glow`).
4. Al añadir tokens Stitch nuevos: declara `--token` en `:root` **y** expón en `@theme inline` como `--color-token`.

### Mapeo shadcn ↔ Stitch

| Componente shadcn | Variante | Estilo TicTrack |
|-------------------|----------|-----------------|
| `Button` | `default` | `bg-primary text-primary-foreground` o CTA `bg-primary-container text-on-primary-container` |
| `Button` | `outline` | Borde `border-outline-variant`, hover `bg-surface-variant/30` |
| `Button` | `ghost` | Solo hover tonal, sin fondo sólido |
| `Badge` | chips de estado | `rounded-full text-[10px] uppercase font-bold` + tint `/20` del color |
| `Progress` | barras | Altura `h-1.5`, track `bg-surface-variant`, fill `bg-primary` o `bg-destructive` |
| `Card` | tarjetas | Preferir `.glass-card rounded-2xl` sobre Card sólido |
| `Switch` | toggles | Escala shadcn default; activo usa `primary` |
| `Input` | campos | Borde inferior minimalista (ver patrones abajo) |

Instala componentes con `pnpm dlx shadcn-vue@latest add <component> --yes`.
Iconos: **Lucide** (`@lucide/vue`), no Material Symbols.

### Opacidad y variantes

- Fondos tintados: `bg-{token}/10`, `/20`, `/30` — nunca opacidad arbitraria sin token.
- Bordes sutiles: `border-outline-variant/10` o `border-white/5`.
- Glow activo: `shadow-primary/20` o `text-shadow` vía `.timer-glow`.
- Nav activa: `bg-primary-container/10 border-r-4 border-primary`.

## Tipografía

| Escala Stitch | Fuente | Clase / utilidad | Uso |
|---------------|--------|------------------|-----|
| `display-timer` | JetBrains Mono | `.font-display-timer` | Timer principal (64px) |
| `headline-lg` | Montserrat | `font-heading text-2xl/3xl font-bold` | Títulos de página |
| `headline-md` | Montserrat | `font-heading text-xl/2xl font-semibold` | Subtítulos, nombres de tarea |
| `body-md` | Inter | `text-base` (default `font-sans`) | Texto UI |
| `body-sm` | Inter | `text-sm` | Subtítulos, metadata |
| `label-mono` | JetBrains Mono | `.font-label-mono` | IDs, labels uppercase, stats |

Encabezados HTML (`h1`–`h6`) ya usan `font-heading` vía `@layer base`.

## Espaciado y layout

Escala base **4px**, ritmo **8px** para padding/margin:

| Token | Valor | Tailwind equivalente |
|-------|-------|---------------------|
| xs | 8px | `gap-2`, `p-2` |
| sm | 12px | `gap-3`, `p-3` |
| md | 16px | `gap-4`, `p-4` |
| lg | 24px | `gap-6`, `p-6` |
| xl | 32px | `gap-8`, `p-8` |
| 2xl | 48px | `gap-12`, `p-12` |
| container-margin | 24px | `p-6` en contenedores |
| gutter | 16px | `gap-4` en grids |

**Layout desktop:**

- Sidebar expandida: **240px** (`w-60`), fija izquierda.
- Main: `ml-60`, contenido max `max-w-7xl mx-auto`.
- Header sticky: `h-16`, `backdrop-blur-xl`, `bg-background/80`.

## Border radius

| Uso | Valor | Clase |
|-----|-------|-------|
| Chips, inputs pequeños | 4–8px | `rounded-lg` |
| Botones, cards estándar | 8px | `rounded-xl` (`--radius: 0.5rem`) |
| Contenedores principales | 16px | `rounded-2xl` |
| FAB, timer CTA | 24px+ | `rounded-full` |

## Efectos de profundidad

```css
/* Usar utilidades existentes — no duplicar en componentes */
.glass-card    /* tarjetas flotantes */
.timer-glow    /* dígitos del timer activo */
.shimmer       /* barra superior en sesión activa */
```

- Modales/dropdowns: `backdrop-blur-xl` + `bg-background/80`.
- Focus layer: glow primary al 20%, no box-shadow negro.

## Patrones de componentes

### Botones

- **CTA principal** (ej. "Nueva Tarea"): `bg-primary-container text-on-primary-container rounded-xl font-bold shadow-lg shadow-primary/20`.
- **Acción en timer** (ej. "Pausa"): `Button` default (`bg-primary`).
- **Secundario**: `Button variant="outline"` con borde `outline-variant`.
- Hover: +10% brillo (`hover:bg-primary/90`), `active:scale-95`.

### Timer

- Fuente: `.font-display-timer.timer-glow`.
- Anillo SVG: track `text-surface-variant/30`, progreso `text-primary`.
- Label: `.font-label-mono text-xs uppercase text-muted-foreground`.

### Task cards

- Contenedor: `.glass-card rounded-2xl p-6`.
- Drag handle: icono `GripVertical`, `cursor-grab`.
- Completada: `opacity-60`, `line-through` en título.
- Overtime: `border-destructive/20 bg-destructive/5`, progress `bg-destructive`.

### Inputs

- Minimalista: sin fondo, borde inferior `border-border`, focus `border-primary ring-ring`.
- Preferir componentes shadcn `Input` customizados con clases de tema.

### Status chips

- Forma: `rounded-full text-[10px] uppercase font-bold`.
- Fondo: `bg-{semantic}/20`, texto: `text-{semantic}`.

### Progress bars

- Altura: `h-1.5` (4–6px).
- Activo con grabación: añadir `.shimmer` al contenedor padre.

## Logo

Hasta tener asset final de Stitch, usar **`/tauri.svg`** junto al wordmark "TicTrack".

## Anti-patrones (prohibido)

| ❌ Evitar | ✅ Hacer |
|----------|---------|
| `text-[#c0c1ff]`, `bg-slate-800` | `text-primary`, `bg-surface-container` |
| Geist / system fonts en UI | Inter, Montserrat, JetBrains Mono |
| Material Icons | Lucide (`@lucide/vue`) |
| Light mode por defecto | Dark-first, tokens en `:root, .dark` |
| Sombras negras fuertes | Capas tonales + glow primary |
| Colores semánticos cruzados | Ver tabla de estados |
| Duplicar tokens fuera de `tailwind.css` | Centralizar cambios ahí |
| Ignorar variantes shadcn | `variant="outline"`, `size="icon"`, etc. |

## Al recibir diseños nuevos de Stitch

1. Obtener `designMd` vía MCP (`get_project` o `get_screen`).
2. Actualizar **solo** `tailwind.css` si cambian tokens.
3. Sincronizar esta skill si cambian reglas de componentes.
4. Implementar UI con shadcn + clases semánticas.
5. Verificar con skill `design-verify`.

## Checklist antes de entregar UI

- [ ] Cero hex hardcodeados en `.vue`
- [ ] Tipografías correctas por rol
- [ ] Capas surface coherentes (sidebar → card → elevated)
- [ ] Estados semánticos respetados
- [ ] Componentes shadcn con variantes, no HTML crudo estilizado
- [ ] Border radius acorde al componente
- [ ] Espaciado en escala 4/8px
