import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });
const config = [...compat.extends("next/core-web-vitals", "next/typescript"), { ignores: [".next/**", "next-env.d.ts", "node_modules/**", "supabase/**"] }];
export default config;
