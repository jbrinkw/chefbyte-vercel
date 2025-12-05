#!/usr/bin/env node
/* Temporary diagnostic script for Grocy job worker integration */

const path = require('path');

// Ensure we load the same .env as the real server
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const processor = require('./processor');

async function main() {
  const [, , opArg, barcode] = process.argv;
  if (!opArg || !barcode) {
    console.error('Usage: node debug_job_worker.js <add|remove> <BARCODE>');
    process.exit(1);
  }

  const op = opArg.toLowerCase();
  if (!['add', 'remove'].includes(op)) {
    console.error(`Unsupported operation "${opArg}". Only "add" or "remove" are valid.`);
    process.exit(1);
  }

  console.log('--- Grocy Job Worker Debug ---');
  console.log('Operation:', op);
  console.log('Barcode:', barcode);
  console.log();

  try {
    const result = await processor.run(op, barcode);

    console.log('Raw processor result:');
    console.dir(result, { depth: null });
    console.log();

    const workerSeesSuccess = !!(result && result.success);
    console.log('Worker sees result.success?', workerSeesSuccess);
    if (!workerSeesSuccess) {
      console.log('=> Worker would currently treat this as a failure.');
      console.log('=> result.error:', result && result.error);
    }

    if (processor.run.lastLogs?.length) {
      console.log();
      console.log('Processor logs:');
      for (const log of processor.run.lastLogs) {
        console.log(' ', log);
      }
    }
  } catch (err) {
    console.error('Processor threw an error:');
    console.error(err);
  }
}

main();
