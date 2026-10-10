import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin.ts";

test("discovers nested TSX mockups and excludes private files and directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-discovery-"));
  try {
    const mockups = [
      "Card.tsx",
      "nested/Button.tsx",
      "_Private.tsx",
      "_internal/Hidden.tsx",
      "nested/_private/Hidden.tsx",
      "nested/_Helper.tsx",
      "NotAMockup.ts",
    ];
    for (const file of mockups) {
      const target = path.join(root, "src/components/mockups", file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "export default function Mockup() { return null; }");
    }
    const plugin = mockupPreviewPlugin();
    const configResolved = plugin.configResolved as (config: { root: string }) => void;
    const buildStart = plugin.buildStart as () => Promise<void>;
    configResolved({ root });
    await buildStart();
    const generated = await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8");
    assert.match(generated, /"\.\/components\/mockups\/Card\.tsx"/);
    assert.match(generated, /"\.\/components\/mockups\/nested\/Button\.tsx"/);
    assert.match(generated, /import\("\.\.\/components\/mockups\/nested\/Button\.tsx"\)/);
    assert.doesNotMatch(generated, /Private|Hidden|Helper|NotAMockup/);

    await rm(path.join(root, "src/components/mockups/Card.tsx"));
    await buildStart();
    const refreshed = await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8");
    assert.doesNotMatch(refreshed, /Card\.tsx/);
    assert.match(refreshed, /Button\.tsx/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generates an empty module map when the mockups directory is absent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-empty-"));
  try {
    const plugin = mockupPreviewPlugin();
    const configResolved = plugin.configResolved as (config: { root: string }) => void;
    const buildStart = plugin.buildStart as () => Promise<void>;
    configResolved({ root });
    await buildStart();
    const generated = await readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8");
    assert.match(generated, /export const modules: ModuleMap = \{\n\n\};/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
