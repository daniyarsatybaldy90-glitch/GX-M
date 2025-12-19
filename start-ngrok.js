import { spawn } from 'child_process';

const ngrok = spawn('npx', ['ngrok', 'http', '3000']);

ngrok.stdout.on('data', (data) => {
  console.log(`${data}`);
});

ngrok.stderr.on('data', (data) => {
  console.error(`${data}`);
});

ngrok.on('close', (code) => {
  console.log(`ngrok exited with code ${code}`);
});
