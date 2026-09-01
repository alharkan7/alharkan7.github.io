

# 👋 Hola, bienvenido a raihankalla.id

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/alharkan7/alharkan7.github.io)

Este es el código fuente de **[raihankalla.id](https://www.raihankalla.id)** — mi pequeño rincón en internet donde escribo sobre medios, datos, tecnología y todo lo que hay entre medio. (Dato curioso: el dominio es un anagrama de mi nombre completo.)

El blog está construido con [Astro](https://astro.build), porque los sitios web rápidos y centrados en el contenido merecen un framework centrado en el contenido.

---

## 🗺️ ¿Qué hay en el sitio?

El sitio tiene más secciones que un blog típico. Aquí está el mapa completo:

| Sección | ¿Qué es? |
|---|---|
| **[Inicio](https://raihankalla.id/)** | Entradas de blog sobre medios, tecnología y vida |
| **[Datos](https://raihankalla.id/data)** | Páginas de investigación — visualizaciones de datos, análisis y estudios interactivos |
| **[Curado → Videos](https://raihankalla.id/videos)** | Todo mi historial de videos de YouTube que me gustan, filtrable por año y canal |
| **[Curado → Marcadores](https://raihankalla.id/bookmarks)** | Mis marcadores de Chrome, sincronizados automáticamente cada día mediante Supabase |
| **[Curado → Repos](https://raihankalla.id/stars)** | Mis repositorios de GitHub con estrella |
| **[Curado → Lecturas](https://raihankalla.id/readings)** | Mi lista de lectura de Chrome, sincronizada automáticamente |
| **[Otros → Perfil](https://raihankalla.id/bio)** | Quién soy y qué hago |
| **[Aplicaciones ↗](https://alhrkn.vercel.app)** | Herramientas que he creado: Papermap, Outliner, Inztagram |

La sección "Curado" es básicamente una captura en vivo de mi cerebro digital: todo se sincroniza automáticamente desde Supabase para que se mantenga actualizado sin que yo tenga que hacer nada.

---

## 📊 Páginas de Investigación

La sección `/data` alberga páginas interactivas especiales que no encajan en el formato estándar de blog. Están diseñadas para la adecuada difusión de investigación: gráficos, mapas, visualizaciones. Los temas actuales incluyen:

- **Efectos de los Medios en las Elecciones de Indonesia de 2019** — análisis SEM-PLS en 34 provincias
- **Google Trends como predictor electoral** — spoiler: no es tan confiable como esperarías
- **Análisis del Mercado Laboral de Yakarta** — más de 19K ofertas de trabajo extraídas y analizadas
- **Análisis de TurnBackHoax (2024 y 2025)** — modelado de temas, redes de texto, análisis de sentimientos
- **Evolución del Presupuesto Nacional** — el APBN de Indonesia a lo largo del tiempo
- **Kekayaan Bahasa Nusantara** — una celebración de la riqueza lingüística de Indonesia
- **Financiamiento Verde para PYMES** — informes de investigación de BRIN
- ...y más

---

## 📜 Plantilla de ScrollyTelling

Lo más impresionante de este repositorio es el **sistema ScrollyTelling**: un framework reutilizable de narrativa impulsada por el desplazamiento (scroll), construido desde cero con Astro, D3.js y TypeScript. Se encuentra en [`src/scrolly/`](./src/scrolly/).

> **¡Siente libre de copiarlo y usarlo en tus propios proyectos!** Incluso hay una [entrada de blog](https://raihankalla.id/create-scrollytelling) que explica la arquitectura.

### La idea

Al presentar investigación, un PDF estático o un artículo plano simplemente no es suficiente. ScrollyTelling mantiene las visualizaciones **sincronizadas con la narrativa**: a medida que te desplazas por el texto, el gráfico a la derecha se actualiza dinámicamente para reflejar exactamente lo que estás leyendo.

Míralo en vivo: [**Efectos de los Medios en la Elección**](https://raihankalla.id/media-effects-election) · [**Predicción de Google Trends**](https://raihankalla.id/google-trends-prediction)

### Arquitectura: 4 capas limpias

```
┌─────────────────────────────────────────────────────────────┐
│  src/posts/scrolly/my-story.mdx      ← your narrative       │
│  src/scrolly/data/my-story.ts        ← your data & charts   │
│  src/layouts/ScrollyLayout.astro     ← the layout glue      │
│  src/scrolly/scrolly-runtime.ts      ← scroll engine        │
└─────────────────────────────────────────────────────────────┘
```

| Capa | Archivo | Propósito |
|---|---|---|
| 📖 **Narrativa** | `src/posts/scrolly/*.mdx` | Escribe tu historia en Markdown con bloques `<ScrollySection id="...">` |
| 📊 **Datos** | `src/scrolly/data/*.ts` | Exporta un objeto `config` con todas las configuraciones de visualización, conjuntos de datos y estadísticas principales |
| 🎨 **Maquetación** | `src/layouts/ScrollyLayout.astro` | Ensambla la maquetación pegajosa de dos columnas; vincula datos con la narrativa mediante `configId` |
| ⚙️ **Motor** | `src/scrolly/scrolly-runtime.ts` | Intersection Observer + seguimiento de scroll → cambia los paneles de visualización cuando corresponde |

### Cómo funciona el motor de desplazamiento

El entorno de ejecución utiliza la **Intersection Observer API** para monitorear cada elemento `<ScrollySection>`. Cuando una sección entra en el viewport, ejecuta `switchViz(vizId)`, que hace aparecer con desvanecimiento el panel de visualización correspondiente e inicializa (perezosamente) su módulo D3. Sin sondeos (polling). Sin saturación de eventos de scroll.

En **móviles**, recurre a un cálculo de posición de desplazamiento relativo a la columna pegajosa de visualización, y añade una navegación por pestañas deslizable para que los lectores puedan saltar entre gráficos.

### Módulos de visualización D3 (14 integrados)

Todos se encuentran en `src/scrolly/viz/`:

| Módulo | Tipo | Notas |
|---|---|---|
| `timeline` | Línea/área SVG | Series temporales multiseries |
| `bubbles` | Gráfico de burbujas SVG | Círculos proporcionales |
| `scatter` | Diagrama de dispersión SVG | Con resaltado y anotación |
| `bars` | Gráfico de barras SVG | Horizontal / vertical |
| `matrix` | Mapa de calor SVG | Cuadrícula con escala de color |
| `map` | Div (Leaflet/D3) | Mapas coropléticos o de puntos |
| `dualmap` | Div | Dos mapas lado a lado |
| `sem` | SVG | Diagrama de modelo de ecuaciones estructurales |
| `sentiment` | SVG | Distribución de sentimientos |
| `precision` | SVG | Dispersión de precisión/exactitud |
| `accuracy` | SVG | Comparación de exactitud |
| `equation` | SVG | Renderizado de fórmulas matemáticas |
| `market` | SVG | Posicionamiento de mercado/competitivo |
| `upgrade` | Div | Paneles de maquetación enriquecida personalizada |

### Escribiendo una nueva historia

**1. Crea tu archivo MDX** en `src/posts/scrolly/my-story.mdx`:

```mdx
---
layout: ../../layouts/ScrollyLayout.astro
configId: my-story
theme:
  accent: "#4DE1FF"
  paper: "#070A12"
---

import ScrollySection from '../../components/scrolly/ScrollySection.astro';

<ScrollySection id="intro">
  ## Welcome to the Story
  Your narrative here. When this section is in view,
  the `intro` visualization panel will activate.
</ScrollySection>

<ScrollySection id="finding1">
  ## The Big Finding
  More text. The `finding1` chart will fade in now.
</ScrollySection>
```

**2. Crea tu archivo de datos** en `src/scrolly/data/my-story.ts`:

```typescript
export const config = {
  configId: "my-story",
  hero: {
    title: "My Data Story",
    subtitle: "A subtitle",
    stats: [{ label: "Data Points", value: 1234 }],
  },
  sections: [
    {
      id: "intro",
      navLabel: "Introduction",
      viz: {
        key: "bubbles",
        title: "Growth over time",
        mount: "svg",
        props: {
          series: ["internet", "tv"],
          data: [{ year: 2000, internet: 1.9, tv: 88 }],
        },
      },
    },
    {
      id: "finding1",
      navLabel: "Key Finding",
      viz: {
        key: "scatter",
        title: "The correlation",
        mount: "svg",
        props: { /* your data */ },
      },
    },
  ],
};
```

**3. Hecho.** Visita `/my-story` y desplázate.

→ Documentación técnica completa: [`src/scrolly/README.md`](./src/scrolly/README.md)  
→ Análisis profundo de la arquitectura: [Creando Scrollytelling Interactivo](https://raihankalla.id/create-scrollytelling)

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework** | [Astro](https://astro.build) — generación de sitios estáticos con arquitectura de islas |
| **UI** | Componentes de [React](https://react.dev/) + [Svelte](https://svelte.dev/) lado a lado |
| **Visualizaciones** | [D3.js](https://d3js.org/) — todos los módulos de gráficos son D3 hecho a mano |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) en todas partes |
| **Estilos** | [Tailwind CSS](https://tailwindcss.com) + CSS nativo donde sea necesario |
| **Contenido** | [MDX](https://mdxjs.com) — Markdown con componentes incrustados |
| **Base de datos** | [Supabase](https://supabase.com/) — almacena marcadores, lecturas, videos y estrellas de GitHub |
| **Autenticación** | [Firebase Auth](https://firebase.google.com/docs/auth) — totalmente del lado del cliente |
| **Despliegue** | [GitHub Pages](https://pages.github.com) + [Vercel](https://vercel.com) |
| **Iconos** | [Heroicons](https://heroicons.com) + [Simple Icons](https://simpleicons.org) |

---

## 🚀 Ejecutándolo localmente

Necesitarás **Node.js 18+** y **pnpm**.

```bash
# 1. Clone it
git clone https://github.com/alharkan7/alharkan7.github.io.git
cd alharkan7.github.io

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your SUPABASE_URL, SUPABASE_ANON_KEY, and Firebase config

# 4. Start the dev server
pnpm dev
```

Abre [http://localhost:4321](http://localhost:4321). Las páginas de ScrollyTelling funcionarán sin variables de entorno. Las páginas Curadas (Marcadores, Videos, etc.) necesitan Supabase.

```bash
# Build for production
pnpm build
```

---

## 📁 Estructura del Proyecto

```
├── public/                   ← static assets
├── scripts/                  ← build/sync scripts
├── src/
│   ├── components/
│   │   └── scrolly/          ← ScrollySection, ScrollyLayout parts
│   ├── content/
│   │   └── featured.ts       ← data page registry
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ScrollyLayout.astro  ← two-column sticky scrolly layout
│   ├── pages/
│   │   ├── index.astro       ← homepage
│   │   ├── bio.astro         ← profile
│   │   ├── bookmarks.astro   ← chrome bookmarks (Supabase)
│   │   ├── readings.astro    ← chrome reading list (Supabase)
│   │   ├── stars.astro       ← github stars (Supabase)
│   │   ├── videos.astro      ← youtube liked videos (Supabase)
│   │   └── data/             ← data research pages index
│   ├── posts/
│   │   ├── blog/             ← ~50 blog posts in MDX/MD
│   │   ├── scrolly/          ← scrollytelling stories
│   │   ├── stories/          ← long-form stories
│   │   ├── misc/             ← misc writings
│   │   └── ptm/              ← communication theory notes
│   ├── scrolly/
│   │   ├── data/             ← per-story data configs
│   │   ├── viz/              ← 14 D3 visualization modules
│   │   ├── scrolly-entry.ts  ← browser entry point
│   │   └── scrolly-runtime.ts← core scroll + viz engine
│   └── styles/               ← global CSS
├── astro.config.mjs
└── package.json
```

---

## 🔐 Autenticación

Algunas páginas requieren inicio de sesión. La autenticación es **100% del lado del cliente** usando Firebase Auth: no se requiere servidor, lo que la hace compatible con alojamiento estático.

Las páginas protegidas usan un componente `<ProtectedRoute />` que verifica el estado de autenticación al cargar y redirige a los usuarios no autenticados. El estado de la sesión persiste entre recargas mediante Firebase + `localStorage`.

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import ProtectedRoute from "../components/ProtectedRoute.astro";
---
<BaseLayout title="Private Page">
  <ProtectedRoute />
  <!-- Content only visible to logged-in users -->
</BaseLayout>
```

---

## 📬 Di hola

- 🌐 [raihankalla.id](https://www.raihankalla.id)
- 🐙 [@alharkan7](https://github.com/alharkan7) en GitHub
- 🐦 [@alhrkn](https://twitter.com/alhrkn) en X/Twitter
- 📸 [@alhrkn](https://instagram.com/alhrkn) en Instagram
- 💼 [linkedin.com/in/alharkan](https://linkedin.com/in/alharkan)

---

## 📄 Licencia

Código abierto bajo la [Licencia MIT](LICENSE). Haz un fork, remézcla, usa la plantilla de ScrollyTelling: suelta la imaginación.
