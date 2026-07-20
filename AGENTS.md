# Permanent project constraints

- Use WebXR through A-Frame with vanilla JavaScript, HTML and CSS only.
- Keep the application offline-first; every runtime dependency and asset must be local.
- Never add a runtime CDN, remote API, font, sound, model or analytics dependency.
- Prefer classroom reliability and legibility over visual complexity or photorealism.
- Keep the simplified physics internally consistent by deriving visuals, explanations and detector readings from `js/config.js` and `js/physics-model.js`.
- Preserve both Meta Quest controller-ray interaction and desktop mouse interaction.
- Use pooled procedural geometry; avoid a full physics engine and large 3D models.
- Test changes before declaring them complete. Run `npm test` (or `pnpm test`) and `npm run check` (or `pnpm check`).
- WebXR requires HTTPS on the Quest; localhost HTTP is only for desktop development.
