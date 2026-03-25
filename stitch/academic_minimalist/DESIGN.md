# Design System: The Editorial Scholar

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Curator"**

This design system moves beyond the utility of a standard PDF reader and enters the realm of a high-end editorial workspace. It is designed for the focused researcher, blending the rigorous precision of **VS Code** with the spatial elegance of **Notion**. 

We reject the "boxed-in" nature of traditional software. Instead of rigid grids and heavy borders, we utilize **Intentional Asymmetry** and **Tonal Layering**. The layout should feel like a series of clean, stacked parchment sheets on a slate desk. By using expansive white space (defined by our `surface` tokens) and a sophisticated typographic scale, we transform a tool into an environment.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
Our palette is rooted in low-contrast, high-sophistication neutrals to eliminate eye strain during multi-hour research sessions.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. 
*   **How to define boundaries:** Use background shifts. A sidebar should be `surface-container-low` sitting against a `surface` main stage. 
*   **The Intent:** Borders create visual noise; tonal shifts create "zones" of focus.

### Surface Hierarchy & Nesting
Treat the UI as physical layers. Each step up in importance requires a step up in surface elevation:
*   **Base Layer:** `surface` (#f7fafc) – The main canvas.
*   **Secondary Zones:** `surface-container` (#e7eff3) – Sidebars and navigation.
*   **Active Focus:** `surface-container-lowest` (#ffffff) – The primary reading document or active text input. This creates a "glow" effect that draws the eye naturally.

### The Glass & Gradient Rule
For floating utility bars (like a PDF annotation floater), use **Glassmorphism**:
*   **Fill:** `surface_variant` at 70% opacity.
*   **Effect:** `backdrop-blur: 12px`.
*   **Signature Texture:** Use a subtle linear gradient on primary CTAs—transitioning from `primary` (#585e6c) to `primary_dim` (#4c5260)—to provide a "metallic ink" feel that flat colors lack.

---

## 3. Typography: The Editorial Contrast
We use a high-contrast pairing: **Manrope** (Sans-Serif) for the functional UI "machine," and **Newsreader** (Serif) for the human-centric "content."

*   **The Functional UI:** `label-md` (Inter/Manrope) at 0.75rem. This is for the "VS Code" style metadata, line numbers, and small UI labels. It conveys precision.
*   **The Narrative Body:** `body-lg` (Newsreader) at 1rem. All research text, PDF content, and AI summaries must use this serif. It slows down the reader and increases comprehension.
*   **Headlines:** `headline-lg` (Manrope) provides a modern, bold anchor to pages, ensuring the "Academic Minimalist" look remains contemporary.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "heavy" for an academic tool. We achieve depth through light and texture.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-highest` (#d7e5eb) element behind a `surface-container-lowest` (#ffffff) element. The contrast difference (approx. 12%) is enough to imply a physical lift.
*   **Ambient Shadows:** For high-level modals only. Use an extra-diffused shadow: `0 20px 40px rgba(40, 52, 57, 0.05)`. Note the color is a tint of `on-surface`, not pure black.
*   **The Ghost Border:** If a divider is strictly necessary for accessibility (e.g., in a complex data table), use the `outline-variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Precision & Functionality

### Input Fields & Text Areas
*   **Style:** No background. Use a "Ghost Border" bottom-line only or a subtle `surface-container-high` background with `roundness-md`.
*   **Focus State:** Transition the bottom border to `primary` (#585e6c). No "blue glow" outer rings.

### Buttons (The "Precision Tool" Look)
*   **Primary:** Solid `primary` with `on-primary` text. `roundness-sm` (0.125rem) to maintain a sharp, functional aesthetic.
*   **Tertiary/Ghost:** Use `on-surface-variant` text. Background only appears on hover using `surface-container-highest`.

### Cards & Lists
*   **Rule:** Forbid divider lines.
*   **Execution:** Separate list items using the **Spacing Scale `2.5` (0.5rem)**. Group related items by nesting them on a `surface-container-low` plinth.

### Academic Highlight Chips
*   **Important:** Use `tertiary_fixed` (#fcb259) for the background with `on_tertiary_fixed` text. This "Subtle Yellow" should feel like a weathered highlighter, not a warning sign.
*   **Unknown:** Use `error_container` (#fe8983) for the background. This "Soft Coral" indicates a gap in knowledge without being as aggressive as a system error.

### PDF Annotation Toolbar
*   A horizontal floating bar. Use the **Glassmorphism** rule.
*   Icons should be thin-stroke (2px) to match the `label-sm` typographic weight.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. Give the document (the focus) 60% of the screen and the assistant 30%, leaving 10% for "dead air" to reduce cognitive load.
*   **Do** use `Newsreader` for any text longer than two sentences.
*   **Do** use `surface-dim` for empty states to create a "hollowed-out" feeling.

### Don’t
*   **Don't** use 100% black (#000000). Always use `on-surface` (#283439) for text to maintain the soft-gray academic aesthetic.
*   **Don't** use standard `roundness-lg` for primary UI buttons; keep them `sm` or `md` to maintain the "VS Code" precision.
*   **Don't** use bright, saturated red for errors. Stick to the `error` (#9f403d) and `error_container` tokens for a sophisticated, muted tone.