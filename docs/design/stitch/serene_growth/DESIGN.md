---
name: Serene Growth
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#42493f'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#72796f'
  outline-variant: '#c2c9bd'
  surface-tint: '#3c683b'
  primary: '#3c683b'
  on-primary: '#ffffff'
  primary-container: '#7faf7b'
  on-primary-container: '#164219'
  inverse-primary: '#a1d39c'
  secondary: '#526168'
  on-secondary: '#ffffff'
  secondary-container: '#d2e2eb'
  on-secondary-container: '#56656d'
  tertiary: '#50616b'
  on-tertiary: '#ffffff'
  tertiary-container: '#94a6b1'
  on-tertiary-container: '#2b3c45'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bdf0b6'
  primary-fixed-dim: '#a1d39c'
  on-primary-fixed: '#002205'
  on-primary-fixed-variant: '#245026'
  secondary-fixed: '#d5e5ee'
  secondary-fixed-dim: '#b9c9d2'
  on-secondary-fixed: '#0f1d24'
  on-secondary-fixed-variant: '#3a4950'
  tertiary-fixed: '#d3e5f1'
  tertiary-fixed-dim: '#b7c9d4'
  on-tertiary-fixed: '#0c1e26'
  on-tertiary-fixed-variant: '#384952'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  nav_width: 240px
  side_info_width: 320px
  container_max_width: 1440px
  gutter: 32px
  section_margin: 64px
  unit: 8px
---

## Brand & Style
The design system is centered on the concept of "Restrained Growth." It targets adults seeking to improve their communication skills through a platform that feels like a professional psychology practice or a high-end personal growth dashboard. 

The style is a blend of **Minimalism** and **Modern Corporate**, leaning heavily on expansive whitespace and quiet sophistication. It avoids the typical "SaaS" look of floating cards and heavy shadows, opting instead for a structural, editorial layout. The emotional response is one of calm, focus, and intellectual maturity. Surfaces are flat and grounded, using subtle dividers rather than containers to organize information, echoing the clarity of a well-organized mind.

## Colors
The palette is rooted in an organic, warm off-white (`#F7F7F5`) which serves as the canvas for all interactions. This "paper" background reduces eye strain and feels more personal than pure white. 

- **Primary:** A soft, sage-like green used sparingly for progress indicators, success states, and primary actions.
- **Secondary (Deep Gray):** Used for secondary text and structural lines, providing weight without the harshness of pure black.
- **Tertiary (Misty Blue):** Reserved for subtle accents, data visualization, and inactive states.
- **Text:** High-contrast `#181818` ensures maximum readability for instructional content and transcripts.

## Typography
Typography is the primary driver of the hierarchy. For Chinese text, use **PingFang SC** as the primary typeface to maintain a clean, modern aesthetic. For alphanumeric characters, the design system utilizes **Hanken Grotesk** for headings to convey precision and **Be Vietnam Pro** for body text to maintain a friendly, approachable warmth.

Headlines should be powerful and given ample breathing room. Body text follows a generous line height (1.6) to facilitate long-form reading of communication scripts and psychological theory. Use all-caps labels with slight tracking for metadata and categories to distinguish them from narrative content.

## Layout & Spacing
The layout uses a **Fixed-Column Grid** model. On desktop (1440px), the interface is split into three distinct functional zones:
1.  **Left Navigation:** Fixed width, minimal icons, high vertical whitespace.
2.  **Central Content:** The "Stage" for learning and training. Content is constrained to a readable width (max 800px) even within the center pane.
3.  **Right Info Panel:** Contextual data, skill levels, and progress tracking.

Avoid card-based containment. Use horizontal rules (1px width, low opacity) and 64px vertical margins to define sections. This "Notion-style" openness encourages a flow of information rather than a fragmented experience.

## Elevation & Depth
This design system rejects heavy shadows and depth. It uses **Tonal Layers** and **Low-Contrast Outlines** to define hierarchy.

- **Level 0 (Base):** The `#F7F7F5` background.
- **Level 1 (Interactive):** Elements like input fields or hovered items use a slightly darker tint of the background or a 1px solid border in `#E5E5E3`.
- **Level 2 (Popovers):** For menus or tooltips, use a clean white surface with a very soft, diffused ambient shadow (8% opacity, 16px blur) to suggest slight lift without breaking the flat aesthetic.
- **Dividers:** Use 1px lines in `#E5E5E3` to separate logical content blocks.

## Shapes
The shape language is **Soft (0.25rem)**. While the overall vibe is professional and structured, these subtle radii prevent the UI from feeling cold or aggressive. 

- **Interactive Elements:** Buttons and input fields use a consistent 4px radius.
- **Visual Aids:** Progress bars and radar chart nodes use the same rounding logic.
- **Selection States:** Horizontal selectors use a "pill" shape only when they are fully enclosed, otherwise, they utilize a simple underline or background tint.

## Components
- **Horizontal Selectors:** Minimalist text-only tabs. The active state is indicated by the Primary Green text and a subtle 2px bottom bar. No background "bubbles" unless used as a secondary toggle.
- **Notion-like Tables:** Borderless tables with light gray headers. Rows should have a subtle background tint on hover. Cell padding is generous to maintain an editorial feel.
- **Radar Charts:** 5-dimensional charts using a stroke-only approach. The interior area should have a very light 10% opacity fill of the Primary Green. Vertices should be small, clean circles.
- **Buttons:**
    - *Primary:* Solid Primary Green with White text.
    - *Secondary:* Outline in Deep Gray, text in Deep Gray.
    - *Ghost:* Text only, shifting to a light gray background on hover.
- **Input Fields:** Bottom-border only or very light four-sided borders. No heavy shadows. Focused states transition the border color to Primary Green.
- **Skill Chips:** Small, low-saturation green or blue backgrounds with dark text. Used to tag communication techniques (e.g., "Empathy," "Assertiveness").