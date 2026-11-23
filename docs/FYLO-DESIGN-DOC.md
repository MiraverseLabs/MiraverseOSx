# FYLO
## File Management, Digital Documents, and Application Integration System
**MiraverseOSx | Game Design Document**

**Developer:** Fylo Systems  
**System Category:** Personal File Management and Digital Storage  
**Development Status:** Active Implementation & Overhaul  
**Former Application Name:** VAULT

---

## 1. System Overview & Identity
- **Developer:** Fylo Systems
- **Visual Direction:** Balanced Decorative with Soft 3D materials, satin surfaces, layered paper influences, serif display headings, sans-serif interface typography, and monospace technical metadata.
- **Official Working Palette (Lavender Sunset):**
  - Scampi: `#6B5FA4` (Primary navigation and application branding)
  - Faraway Sky: `#8787CE` (Secondary controls and interface accents)
  - Portage: `#9995E8` (Interactive highlights and decorative elements)
  - Statice: `#BF93D0` (Folder accents and supporting surfaces)
  - Warm Undertone: `#FDB5A5` (Warm decorative highlights)
  - Sunset Cloud: `#FDD2A3` (Soft peach accents and illustrations)

## 2. Core Ecosystem Integration
- **Fylo (Fylo Systems):** Manages files, folders, downloads, personal notes, saved documents, Favorites, Recent, and Trash. Opens files through compatible applications without acting as a universal editor.
- **AureMail:** Sends and receives email and file attachments. Attachments are ordinary files retaining original extensions and contents; saving an attachment creates an independent retained file in Fylo that survives source-email deletion.
- **VerseNet:** Public information and downloadable resources retained in Fylo.
- **Document Studio:** Creates, formats, and prepares compatible documents and reports that can be saved into Fylo without conferring institutional modification authority.

## 3. Canonical 30-Extension Inventory
- **Documents, Forms & Personal Files:** `.osform`, `.form`, `.doc`, `.docx`, `.txt`, `.pdf`, `.note`, `.ics`
- **System & Technical Files:** `.log`, `.sys`, `.arch`, `.prism`, `.corrupt`
- **Geographic & Network Files:** `.map`, `.node`, `.grid`
- **SpellForge & Specialized Files:** `.mod`, `.spell`, `.veil`
- **Medical & Diagnostic Files:** `.diag`, `.aura`
- **Audio & Image Files:** `.sig`, `.wav`, `.img`, `.jpg`, `.jpeg`, `.png`, `.webp`
- **Financial & Institutional Files:** `.grant`, `.payment`

## 4. Architecture & Acceptance
- Hybrid file system distinguishing personal files, retained copies, protected system files, institutional records, and submitted records.
- Stable internal file identifiers independent of filename or folder path.
- Display modes: **Large Icons**, **Grid**, and **Details/List**, plus a collapsible right-side **File Details Panel** and **Personal Dashboard** home screen.
- File & folder actions: Create Folder, Create/Edit `.note`/`.txt`, Rename (retaining extension), Move, Copy, Pin/Favorite, Send via AureMail, Move to Trash, Restore, Permanent Delete with confirmation, and Empty Trash.
