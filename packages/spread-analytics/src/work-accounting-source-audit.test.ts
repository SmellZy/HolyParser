// Static work-accounting audit (fifth remediation). The runtime oracle cannot
// observe native string equality, string hashing, object spreads or template
// concatenation; this audit uses the TypeScript checker over every runtime
// module to require that each such site is charged, bounded or justified.
// It is evidence paired with direct adversarial tests, not proof on its own.
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const directory = fileURLToPath(new URL(".", import.meta.url));
const runtimeFiles = readdirSync(directory)
  .filter(
    (name) =>
      name.endsWith(".ts") &&
      !name.endsWith(".test.ts") &&
      name !== "test-fixtures.ts" &&
      name !== "work-oracle.ts",
  )
  .sort()
  .map((name) => `${directory}${name}`);

const compile = (files: readonly string[]) =>
  ts.createProgram(files, {
    strict: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
  });

const literalOnly = (type: ts.Type): boolean =>
  type.isUnion()
    ? type.types.every(literalOnly)
    : (type.flags &
        (ts.TypeFlags.StringLiteral |
          ts.TypeFlags.NumberLike |
          ts.TypeFlags.BooleanLike |
          ts.TypeFlags.BigIntLike |
          ts.TypeFlags.Undefined |
          ts.TypeFlags.Null |
          ts.TypeFlags.EnumLiteral)) !==
      0;
const containsString = (type: ts.Type): boolean =>
  type.isUnion()
    ? type.types.some(containsString)
    : (type.flags & ts.TypeFlags.String) !== 0 ||
      (type.isIntersection() && type.types.some(containsString));

interface Site {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}
function annotated(source: ts.SourceFile, node: ts.Node): boolean {
  const line = source.getLineAndCharacterOfPosition(node.getStart()).line;
  const lines = source.text.split("\n");
  return [line, line - 1, line - 2].some((index) =>
    (lines[index] ?? "").includes("// work:"),
  );
}
function enclosingFunctionText(node: ts.Node): string {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isFunctionLike(current)) current = current.parent;
  return current?.getText() ?? "";
}
function insideMatchingFailure(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent)
    if (
      ts.isNewExpression(current) &&
      current.expression.getText() === "MatchingFailure"
    )
      return true;
  return false;
}

function audit(files: readonly string[], base: string) {
  const program = compile(files);
  const checker = program.getTypeChecker();
  const found = {
    stringEquality: [] as Site[],
    unchargedKeys: [] as Site[],
    unchargedSpreads: [] as Site[],
    unjustifiedTemplates: [] as Site[],
    hostDates: [] as Site[],
    counts: { equality: 0, keys: 0, spreads: 0, templates: 0 },
  };
  for (const source of program.getSourceFiles()) {
    if (!files.includes(source.fileName)) continue;
    const site = (node: ts.Node): Site => ({
      file: source.fileName.slice(base.length),
      line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      text: node.getText().slice(0, 100),
    });
    const visit = (node: ts.Node): void => {
      if (
        ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
        ].includes(node.operatorToken.kind)
      ) {
        found.counts.equality += 1;
        const left = checker.getTypeAtLocation(node.left);
        const right = checker.getTypeAtLocation(node.right);
        // Equality with a fixed literal is length-gated by the engine; two
        // open strings must go through the charged sameText helper.
        if (
          containsString(left) &&
          containsString(right) &&
          !literalOnly(left) &&
          !literalOnly(right) &&
          !annotated(source, node)
        )
          found.stringEquality.push(site(node));
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ["get", "set", "has", "add", "delete"].includes(
          node.expression.name.text,
        ) &&
        node.arguments.length > 0
      ) {
        const receiver = checker.getTypeAtLocation(node.expression.expression);
        const name = receiver.getSymbol()?.getName();
        if (["Map", "Set", "ReadonlyMap", "ReadonlySet"].includes(name ?? "")) {
          found.counts.keys += 1;
          const key = node.arguments[0]!;
          const keyType = checker.getTypeAtLocation(key);
          const charged =
            ts.isCallExpression(key) &&
            key.expression.getText() === "chargeKey";
          if (
            (keyType.flags & ts.TypeFlags.NumberLike) === 0 &&
            !ts.isStringLiteral(key) &&
            !charged &&
            !annotated(source, node)
          )
            found.unchargedKeys.push(site(node));
        }
      }
      if (ts.isSpreadAssignment(node)) {
        found.counts.spreads += 1;
        let expression: ts.Expression = node.expression;
        while (ts.isParenthesizedExpression(expression))
          expression = expression.expression;
        const inline =
          ts.isObjectLiteralExpression(expression) ||
          (ts.isConditionalExpression(expression) &&
            [expression.whenTrue, expression.whenFalse].every(
              (branch) =>
                ts.isObjectLiteralExpression(branch) ||
                (ts.isParenthesizedExpression(branch) &&
                  ts.isObjectLiteralExpression(branch.expression)),
            ));
        const charged = enclosingFunctionText(node).includes(
          `chargeCopy(${expression.getText()}`,
        );
        if (!inline && !charged && !annotated(source, node))
          found.unchargedSpreads.push(site(node));
      }
      if (ts.isTemplateExpression(node)) {
        found.counts.templates += 1;
        if (!insideMatchingFailure(node) && !annotated(source, node))
          found.unjustifiedTemplates.push(site(node));
      }
      if (
        (ts.isPropertyAccessExpression(node) &&
          node.expression.getText() === "Date") ||
        (ts.isNewExpression(node) && node.expression.getText() === "Date")
      )
        found.hostDates.push(site(node));
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

describe("static work-accounting audit of runtime sources", () => {
  const result = audit(runtimeFiles, directory);

  it("audits every runtime module and a non-trivial number of sites", () => {
    expect(runtimeFiles.length).toBeGreaterThanOrEqual(17);
    expect(result.counts.equality).toBeGreaterThan(100);
    expect(result.counts.keys).toBeGreaterThan(20);
    expect(result.counts.spreads).toBeGreaterThan(20);
    expect(result.counts.templates).toBeGreaterThan(15);
  });

  it("compares no two open strings without the charged sameText helper", () => {
    expect(result.stringEquality).toEqual([]);
  });

  it("hashes no string key (Map/Set) without charging it first", () => {
    expect(result.unchargedKeys).toEqual([]);
  });

  it("spreads no caller object without chargeCopy or a fixed-shape justification", () => {
    expect(result.unchargedSpreads).toEqual([]);
  });

  it("builds no template string outside error messages without a justification", () => {
    expect(result.unjustifiedTemplates).toEqual([]);
  });

  it("uses no host Date parsing or construction (H-04)", () => {
    expect(result.hostDates).toEqual([]);
  });

  it("detects every violation class in a control module (non-vacuous)", () => {
    const folder = mkdtempSync(join(tmpdir(), "work-audit-"));
    try {
      const file = join(folder, "control.ts");
      writeFileSync(
        file,
        [
          "declare const a: string;",
          "declare const b: string;",
          "declare const caller: object;",
          "const m = new Map<string, number>();",
          "export const x = a === b;",
          "export const k = m.has(a);",
          "export const y = { ...caller };",
          "export const z = `${a}:${b}`;",
          "export const d = Date.parse(a);",
          "",
        ].join("\n"),
      );
      const control = audit([file], `${folder}/`);
      expect(control.stringEquality).toHaveLength(1);
      expect(control.unchargedKeys).toHaveLength(1);
      expect(control.unchargedSpreads).toHaveLength(1);
      expect(control.unjustifiedTemplates).toHaveLength(1);
      expect(control.hostDates).toHaveLength(1);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
