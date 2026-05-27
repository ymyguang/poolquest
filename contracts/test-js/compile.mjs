import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

const root = path.resolve('contracts/src');
const sources = Object.fromEntries(
  fs.readdirSync(root)
    .filter((file) => file.endsWith('.sol'))
    .map((file) => {
      const filePath = path.join(root, file);
      return [`contracts/src/${file}`, { content: fs.readFileSync(filePath, 'utf8') }];
    })
);

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
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
