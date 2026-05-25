/**
 * Combined CodeQL Report Generator
 *
 * Runs fallow (dead code, duplication, complexity) and react-doctor
 * (React-specific lint) then merges into a single triageable markdown report.
 *
 * Usage: bun run codeql:report
 *        bun run codeql:report -- --diff origin/main
 */

import { $ } from 'bun';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';

const program = new Command()
	.name('generate-codeql-report')
	.description('Generate a combined fallow + react-doctor report')
	.option('--diff <base>', 'Only report issues in files changed vs base ref')
	.option('--out <path>', 'Output path', '.reports')
	.parse();

const opts = program.opts<{ diff?: string; out: string }>();
const root = resolve(import.meta.dirname, '..');

// ── Run both tools in parallel ──────────────────────────────────────────

type FallowSummary = {
	total_issues: number;
	unused_files: number;
	unused_exports: number;
	unused_types: number;
	unused_dependencies: number;
	unused_dev_dependencies: number;
	unused_class_members: number;
	circular_dependencies: number;
	unresolved_imports: number;
	unlisted_dependencies: number;
	duplicate_exports: number;
};

type FallowFile = { path: string };
type FallowExport = { path: string; export_name: string; line: number };
type FallowType = { path: string; export_name: string; line: number };
type FallowDep = { package_name: string; location: string };
type FallowClassMember = {
	path: string;
	class_name: string;
	member_name: string;
	line: number;
};
type FallowCircular = { files: string[] };
type FallowCloneInstance = {
	file: string;
	start_line: number;
	end_line: number;
};
type FallowCloneGroup = { instances: FallowCloneInstance[] };

type FallowCheck = {
	summary: FallowSummary;
	unused_files: FallowFile[];
	unused_exports: FallowExport[];
	unused_types: FallowType[];
	unused_dependencies: FallowDep[];
	unused_dev_dependencies: FallowDep[];
	unused_class_members: FallowClassMember[];
	circular_dependencies: FallowCircular[];
};

type FallowDupesData = {
	clone_groups: FallowCloneGroup[];
	stats: {
		duplicated_lines: number;
		duplication_percentage: number;
	};
};

type FallowData = {
	version: string;
	check: FallowCheck;
	dupes?: FallowDupesData;
};

type RDDiagnostic = {
	rule: string;
	severity: string;
	message: string;
	filePath: string;
	line: number;
	column?: number;
	category?: string;
};

type RDData = {
	version: string;
	summary: {
		score: number;
		scoreLabel: string;
		errorCount: number;
		warningCount: number;
		totalDiagnosticCount: number;
	};
	diagnostics: RDDiagnostic[];
};

console.log('Running fallow and react-doctor in parallel...');

const fallowArgs = ['--quiet', '--format', 'json'];
if (opts.diff) fallowArgs.push('--changed-since', opts.diff);

const rdArgs = ['.', '--yes', '--json'];
if (opts.diff) rdArgs.push('--diff', opts.diff);

const [fallowResult, rdResult] = await Promise.allSettled([
	$`fallow ${fallowArgs}`.quiet().text(),
	$`react-doctor ${rdArgs}`.quiet().text(),
]);

if (fallowResult.status === 'rejected' && !fallowResult.reason?.stdout) {
	console.error('fallow failed:', fallowResult.reason?.message ?? fallowResult.reason);
	process.exit(1);
}
if (rdResult.status === 'rejected' && !rdResult.reason?.stdout) {
	console.error('react-doctor failed:', rdResult.reason?.message ?? rdResult.reason);
	process.exit(1);
}

// fallow exits 1 when issues found, but still outputs valid JSON
const fallowRaw =
	fallowResult.status === 'fulfilled'
		? fallowResult.value
		: (fallowResult.reason?.stdout?.toString() ?? '');
const rdRaw =
	rdResult.status === 'fulfilled'
		? rdResult.value
		: (rdResult.reason?.stdout?.toString() ?? '');

const fallow: FallowData = JSON.parse(fallowRaw);
const rd: RDData = JSON.parse(rdRaw);

// ── Build markdown report ───────────────────────────────────────────────

const now = new Date().toISOString().slice(0, 10);
const lines: string[] = [];
const ln = (s = '') => lines.push(s);

ln(`# CodeQL Report — ${now}`);
ln();
ln(`> fallow v${fallow.version} · react-doctor v${rd.version}`);
if (opts.diff) ln(`> Scoped to changes since \`${opts.diff}\``);
ln();

// ── Scoreboard ──────────────────────────────────────────────────────────

const s = fallow.check.summary;
const totalIssues = s.total_issues + rd.summary.totalDiagnosticCount;

ln('## Scoreboard');
ln();
ln(`| Metric | Value |`);
ln(`| --- | --- |`);
ln(`| **Total issues** | **${totalIssues}** |`);
ln(`| Fallow issues | ${s.total_issues} |`);
ln(`| React-Doctor score | ${rd.summary.score}/100 (${rd.summary.scoreLabel}) |`);
ln(`| React-Doctor warnings | ${rd.summary.warningCount} |`);
ln(`| React-Doctor errors | ${rd.summary.errorCount} |`);
ln();

// ── Fallow: Dead Code ───────────────────────────────────────────────────

ln('## Dead Code (fallow)');
ln();
ln('| Category | Count | Severity |');
ln('| --- | --- | --- |');
ln(`| Unused files | ${s.unused_files} | 🔴 error |`);
ln(`| Unused exports | ${s.unused_exports} | 🟡 warn |`);
ln(`| Unused types | ${s.unused_types} | 🟡 warn |`);
ln(`| Unused class members | ${s.unused_class_members} | 🟡 warn |`);
ln(`| Unused dependencies | ${s.unused_dependencies} | 🔴 error |`);
ln(
	`| Unused dev dependencies | ${s.unused_dev_dependencies ?? 0} | 🟡 warn |`,
);
ln(`| Circular dependencies | ${s.circular_dependencies} | 🔴 error |`);
ln();

// Circular deps
if (fallow.check.circular_dependencies.length > 0) {
	ln('### Circular Dependencies');
	ln();
	for (const [i, cycle] of fallow.check.circular_dependencies.entries()) {
		ln(`**Cycle ${i + 1}:**`);
		ln('```');
		for (const f of cycle.files) ln(`  → ${f}`);
		ln('```');
	}
	ln();
}

// Unused files
if (fallow.check.unused_files.length > 0) {
	ln('### Unused Files');
	ln();
	const grouped = groupByDir(fallow.check.unused_files.map((f) => f.path));
	for (const [dir, files] of grouped) {
		ln(`**${dir}/** (${files.length})`);
		for (const f of files) ln(`- \`${f}\``);
	}
	ln();
}

// Unused exports — top files
if (fallow.check.unused_exports.length > 0) {
	ln('### Unused Exports (top 20 files)');
	ln();
	const byFile = new Map<string, FallowExport[]>();
	for (const e of fallow.check.unused_exports) {
		const arr = byFile.get(e.path) ?? [];
		arr.push(e);
		byFile.set(e.path, arr);
	}
	const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

	ln('| File | Count | Exports |');
	ln('| --- | --- | --- |');
	for (const [file, exports] of sorted.slice(0, 20)) {
		const names = exports.map((e) => `\`${e.export_name}\``).join(', ');
		ln(`| ${file} | ${exports.length} | ${names} |`);
	}
	ln();
	if (sorted.length > 20) {
		ln(`*Plus ${sorted.length - 20} more files with unused exports.*`);
		ln();
	}
}

// Unused class members — top files
if (fallow.check.unused_class_members.length > 0) {
	ln('### Unused Class Members (top 10 files)');
	ln();
	const byFile = new Map<string, FallowClassMember[]>();
	for (const m of fallow.check.unused_class_members) {
		const arr = byFile.get(m.path) ?? [];
		arr.push(m);
		byFile.set(m.path, arr);
	}
	const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

	ln('| File | Count | Members |');
	ln('| --- | --- | --- |');
	for (const [file, members] of sorted.slice(0, 10)) {
		const names = members.map((m) => `\`${m.member_name}\``).join(', ');
		ln(`| ${file} | ${members.length} | ${names} |`);
	}
	ln();
}

// Unused deps
const allDeps = [
	...(fallow.check.unused_dependencies ?? []).map((d) => ({
		...d,
		kind: 'dep',
	})),
	...(fallow.check.unused_dev_dependencies ?? []).map((d) => ({
		...d,
		kind: 'dev',
	})),
];
if (allDeps.length > 0) {
	ln('### Unused Dependencies');
	ln();
	for (const d of allDeps) {
		ln(`- \`${d.package_name}\` (${d.kind === 'dev' ? 'devDependencies' : 'dependencies'})`);
	}
	ln();
}

// Unused types
if (fallow.check.unused_types.length > 0) {
	ln('<details>');
	ln('<summary>Unused Types (' + fallow.check.unused_types.length + ')</summary>');
	ln();
	const byFile = new Map<string, FallowType[]>();
	for (const t of fallow.check.unused_types) {
		const arr = byFile.get(t.path) ?? [];
		arr.push(t);
		byFile.set(t.path, arr);
	}
	for (const [file, types] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
		ln(`- **${file}**: ${types.map((t) => `\`${t.export_name}\``).join(', ')}`);
	}
	ln();
	ln('</details>');
	ln();
}

// ── Fallow: Duplication ─────────────────────────────────────────────────

if (fallow.dupes) {
	const dupes = fallow.dupes;
	ln('## Code Duplication (fallow)');
	ln();
	ln(`**${dupes.clone_groups.length} clone groups · ${dupes.stats.duplicated_lines} lines · ${dupes.stats.duplication_percentage.toFixed(1)}%**`);
	ln();

	const sorted = dupes.clone_groups.sort((a, b) => {
		const aLines = a.instances[0].end_line - a.instances[0].start_line;
		const bLines = b.instances[0].end_line - b.instances[0].start_line;
		return bLines - aLines;
	});

	ln('| Lines | Instances | Files |');
	ln('| --- | --- | --- |');
	for (const g of sorted.slice(0, 15)) {
		const lines = g.instances[0].end_line - g.instances[0].start_line + 1;
		const files = g.instances
			.map((i) => `\`${i.file}:${i.start_line}–${i.end_line}\``)
			.join(' ↔ ');
		ln(`| ${lines} | ${g.instances.length} | ${files} |`);
	}
	ln();
}

// ── React-Doctor ────────────────────────────────────────────────────────

ln('## React Lint (react-doctor)');
ln();
ln(`**Score: ${rd.summary.score}/100 (${rd.summary.scoreLabel})** · ${rd.summary.totalDiagnosticCount} diagnostics`);
ln();

if (rd.diagnostics.length > 0) {
	// Group by rule
	const byRule = new Map<string, RDDiagnostic[]>();
	for (const d of rd.diagnostics) {
		const arr = byRule.get(d.rule) ?? [];
		arr.push(d);
		byRule.set(d.rule, arr);
	}
	const sorted = [...byRule.entries()].sort((a, b) => b[1].length - a[1].length);

	ln('### By Rule');
	ln();
	for (const [rule, diags] of sorted) {
		ln(`#### \`${rule}\` (${diags.length})`);
		ln();
		for (const d of diags) {
			ln(`- \`${d.filePath}:${d.line}\` — ${d.message}`);
		}
		ln();
	}
}

// ── Triage Checklist ────────────────────────────────────────────────────

ln('## Triage Checklist');
ln();

const items: Array<{ priority: string; label: string; count: number }> = [];

if (s.circular_dependencies > 0)
	items.push({
		priority: '🔴 P0',
		label: 'Break circular dependencies',
		count: s.circular_dependencies,
	});
if (s.unresolved_imports > 0)
	items.push({
		priority: '🔴 P0',
		label: 'Fix unresolved imports',
		count: s.unresolved_imports,
	});
if (s.unused_dependencies > 0)
	items.push({
		priority: '🔴 P1',
		label: 'Remove unused dependencies',
		count: s.unused_dependencies,
	});
if (s.unused_files > 0)
	items.push({
		priority: '🔴 P1',
		label: 'Delete unused files',
		count: s.unused_files,
	});
if (rd.summary.errorCount > 0)
	items.push({
		priority: '🔴 P1',
		label: 'Fix react-doctor errors',
		count: rd.summary.errorCount,
	});
if (fallow.dupes && fallow.dupes.clone_groups.length > 0) {
	const bigClones = fallow.dupes.clone_groups.filter(
		(g) => g.instances[0].end_line - g.instances[0].start_line > 50,
	);
	if (bigClones.length > 0)
		items.push({
			priority: '🟠 P2',
			label: 'Deduplicate large clones (>50 lines)',
			count: bigClones.length,
		});
}
if (rd.summary.warningCount > 0)
	items.push({
		priority: '🟡 P2',
		label: 'Address react-doctor warnings',
		count: rd.summary.warningCount,
	});
if (s.unused_exports > 0)
	items.push({
		priority: '🟡 P3',
		label: 'Clean up unused exports',
		count: s.unused_exports,
	});
if (s.unused_class_members > 0)
	items.push({
		priority: '🟡 P3',
		label: 'Remove unused class members',
		count: s.unused_class_members,
	});
if (s.unused_types > 0)
	items.push({
		priority: '🟡 P3',
		label: 'Remove unused types',
		count: s.unused_types,
	});

for (const item of items) {
	ln(`- [ ] ${item.priority} **${item.label}** (${item.count})`);
}
ln();

// ── Write ───────────────────────────────────────────────────────────────

const outDir = resolve(root, opts.out);
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, `codeql-report-${now}.md`);
writeFileSync(outPath, lines.join('\n'));
console.log(`\n✓ Report written to ${outPath}`);
console.log(`  ${totalIssues} total issues (fallow: ${s.total_issues}, react-doctor: ${rd.summary.totalDiagnosticCount})`);

// ── Helpers ─────────────────────────────────────────────────────────────

function groupByDir(paths: string[]): [string, string[]][] {
	const map = new Map<string, string[]>();
	for (const p of paths) {
		const parts = p.split('/');
		const dir = parts.length > 2 ? parts.slice(0, -1).join('/') : parts[0];
		const arr = map.get(dir) ?? [];
		arr.push(p);
		map.set(dir, arr);
	}
	return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}
