# Spacing Scale

## Purpose

This project follows a strict 4px grid for spacing utilities.

## Allowed spacing steps

Tailwind spacing classes must use only these steps:

- `0` (0px)
- `1` (4px)
- `2` (8px)
- `3` (12px)
- `4` (16px)
- `5` (20px)
- `6` (24px)
- `8` (32px)
- `12` (48px)
- `16` (64px)

Examples:

- `p-4`, `px-6`, `py-3`
- `m-2`, `mt-8`
- `gap-3`, `space-y-4`

## Disallowed patterns

- Fractional steps: `0.5`, `1.5`, `2.5`, etc.
- Off-scale integer steps: `7`, `9`, `10`, `11`, `13`, `14`, `15`, etc.
- Arbitrary spacing values in spacing utilities: `p-[3px]`, `gap-[10px]`, etc.

## Control size policy

- `h-9` style control sizes are disallowed in this project spacing system.
- Use `-12` variants for those control sizes (`h-12`, `size-12`, `min-w-12`, etc.).

## Scope

Applies to spacing utility families in app code and primitives:

- `p*`, `m*`, `gap*`, `space-*`

## Enforcement

- Run `npm run lint:spacing`.
- `npm run lint` includes spacing lint and fails on violations.
