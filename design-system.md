# Oqulix CRM - Design System & Aesthetics

This document outlines the core design language, styling conventions, and Tailwind classes used in the application. You can use these guidelines to replicate the same premium, minimalist UI in your new application.

## 1. Core Technologies
- **Styling Framework:** Tailwind CSS (v4)
- **Icons:** Lucide React (e.g., `LayoutDashboard`, `Settings`, `Plus`)
- **Alerts/Notifications:** SweetAlert2

## 2. Global Styling & Base Colors
- **Main Background:** `bg-[#FBFBFB]` or `bg-zinc-50`
- **Default Text:** `text-zinc-900`
- **Font Family:** Default Sans-serif (`font-sans antialiased`)
- **Text Selection:** `selection:bg-black selection:text-white`
- **Scrollbar:** Hidden scrollbars for clean UI (`no-scrollbar` utility)

## 3. Typography
- **Page Titles:** `text-3xl font-semibold text-black tracking-tight`
- **Section Headings:** `text-xl font-semibold text-zinc-900`
- **Card Titles:** `text-lg font-semibold text-zinc-900`
- **Subtitles/Descriptions:** `text-sm text-zinc-500 mt-1` or `text-[14px] text-zinc-500`
- **Menu/Category Headers:** `text-[10px] font-semibold text-zinc-600 uppercase tracking-wider`

## 4. Component Layouts

### Cards & Panels
Used to group related content, forms, and data.
- **Classes:** `bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]`
- **Characteristics:** High border radius (`rounded-2xl`), very subtle shadow, soft border.

### Page Layout Structure
- **Main Container:** `h-screen overflow-hidden flex`
- **Content Area:** `p-4 md:p-8 lg:p-10 flex-1 overflow-auto`
- **Max Width Wrapper:** `w-full max-w-[1920px] mx-auto`
- **Sticky Headers:** `sticky top-0 bg-[#fbfbfe]/90 backdrop-blur-md z-10 border-b border-zinc-100 py-4`

## 5. Sidebar Navigation (Dark Theme)
The sidebar uses a dark theme in contrast to the light main layout.
- **Background:** `bg-[#0A0A0A]`
- **Width:** `w-64` (fixed)
- **Menu Items (Active):** `bg-white/10 text-white font-medium rounded-lg px-3 py-2.5`
- **Menu Items (Inactive):** `text-zinc-400 hover:bg-white/5 hover:text-zinc-200 rounded-lg px-3 py-2.5`
- **Icons:** `w-[18px] h-[18px]`
- **Transition:** `transition-all duration-200 ease-in-out`

## 6. Forms & Inputs

### Text Inputs / Selects
- **Classes:** `px-4 py-2 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/5`
- **Characteristics:** Rounded borders (`rounded-xl`), subtle focus ring instead of harsh outlines.

### Badges / Tags (e.g., Categories)
- **Classes:** `inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-800 text-sm font-medium rounded-lg border border-zinc-200`

## 7. Buttons
Standardized button styles for different actions.

- **Primary Button (Add/Create):** 
  `bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 px-4 py-2 transition-colors`
- **Success/Save Action:** 
  `bg-emerald-600 text-white rounded-xl shadow-sm text-sm font-medium hover:bg-emerald-700 px-6 py-2.5 transition-colors`
- **Secondary/Menu Action:** 
  `bg-black text-white rounded-xl text-sm font-medium px-4 py-2.5 shadow-sm`
- **Disabled State:** Add `disabled:opacity-50 disabled:cursor-not-allowed`
- **Icon Sizing inside buttons:** `w-4 h-4` with `flex items-center gap-2`

## 8. Tables (Implied Design Language)
Based on the general aesthetic, tables in this app should follow:
- **Wrapper:** `bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]`
- **Header (th):** `bg-zinc-50 text-zinc-500 font-medium text-sm text-left px-6 py-4 border-b border-zinc-200/80`
- **Cells (td):** `px-6 py-4 border-b border-zinc-100 text-sm text-zinc-800`
- **Row Hover:** `hover:bg-zinc-50/50 transition-colors`

## Summary Checklist for New App
1. [ ] Install `tailwindcss` v4 and `lucide-react`.
2. [ ] Apply global font and background in `index.css` (or equivalent).
3. [ ] Use high border radii (`rounded-xl`, `rounded-2xl`).
4. [ ] Avoid harsh borders (use `border-zinc-200/80`).
5. [ ] Maintain high contrast text (`text-zinc-900` for primary, `text-zinc-500` for secondary).
6. [ ] Include soft transitions (`transition-colors duration-200`).
