import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const root = path.resolve('contracts/src');
const v4CoreRoot = path.resolve('contracts/lib/v4-core/src');

const collectSoliditySources = (dir, unitPrefix) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const sources = {};

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(sources, collectSoliditySources(fullPath, `${unitPrefix}/${entry.name}`));
      continue;
    }
    if (!entry.name.endsWith('.sol')) continue;
    sources[`${unitPrefix}/${entry.name}`] = { content: fs.readFileSync(fullPath, 'utf8') };
  }

  return sources;
};

const sources = {
  ...collectSoliditySources(root, 'contracts/src'),
  '@uniswap/v4-core/src/PoolManager.sol': {
    content: fs.readFileSync(path.join(v4CoreRoot, 'PoolManager.sol'), 'utf8'),
  },
};

const remappings = [
  ['@uniswap/v4-core/src/', 'contracts/lib/v4-core/src/'],
  ['@uniswap/v4-core/', 'contracts/lib/v4-core/'],
  ['forge-std/', 'contracts/lib/v4-core/lib/forge-std/src/'],
  ['solmate/src/', 'contracts/lib/v4-core/lib/solmate/src/'],
  ['@openzeppelin/', 'contracts/lib/v4-core/lib/openzeppelin-contracts/'],
];

const findBySuffix = (dir, suffix) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findBySuffix(fullPath, suffix);
      if (nested) return nested;
      continue;
    }
    if (fullPath.endsWith(suffix)) return fullPath;
  }
  return null;
};

const findImports = (importPath) => {
  for (const [prefix, target] of remappings) {
    if (!importPath.startsWith(prefix)) continue;
    const filePath = path.resolve(importPath.replace(prefix, target));
    if (fs.existsSync(filePath)) return { contents: fs.readFileSync(filePath, 'utf8') };
  }

  if (importPath.startsWith('../') || importPath.startsWith('./')) {
    const suffix = importPath.replace(/^(\.\/|\.\.\/)+/, '');
    const v4File = findBySuffix(v4CoreRoot, suffix);
    if (v4File) return { contents: fs.readFileSync(v4File, 'utf8') };
  }

  const directPath = path.resolve(importPath);
  if (fs.existsSync(directPath)) return { contents: fs.readFileSync(directPath, 'utf8') };

  return { error: `File not found: ${importPath}` };
};

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = output.errors ?? [];
const fatal = errors.filter((error) => error.severity === 'error');
for (const error of errors) {
  const prefix = error.severity === 'error' ? 'ERROR' : 'WARN';
  console.log(`${prefix}: ${error.formattedMessage}`);
}

if (fatal.length > 0) process.exit(1);

const buildDir = path.resolve('contracts/build');
fs.mkdirSync(buildDir, { recursive: true });
for (const [sourceName, contracts] of Object.entries(output.contracts ?? {})) {
  for (const [contractName, artifact] of Object.entries(contracts)) {
    fs.writeFileSync(
      path.join(buildDir, `${contractName}.json`),
      JSON.stringify({ sourceName, contractName, ...artifact }, null, 2)
    );
  }
}

console.log(`Compiled ${Object.keys(output.contracts ?? {}).length} Solidity source files.`);
