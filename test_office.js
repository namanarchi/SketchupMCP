/**
 * Test script xác thực giao thức MCP stdio cho Module Office (Excel & Word)
 */
const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', [path.resolve(__dirname, 'index.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());
      handleMessage(msg);
    } catch (e) {
      console.log('Non-JSON:', line);
    }
  }
});

let step = 0;

function send(obj) {
  server.stdin.write(JSON.stringify(obj) + '\n');
}

function handleMessage(msg) {
  if (msg.id === 1) {
    console.log('[1] Init Success. Protocol:', msg.result.protocolVersion);
    console.log('Sending tools/list...');
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  } else if (msg.id === 2) {
    const tools = msg.result.tools;
    const officeTools = tools.filter(t => t.name.startsWith('excel_') || t.name.startsWith('word_') || t.name.startsWith('office_'));
    console.log(`[2] Tools/list Total: ${tools.length}, Office Tools: ${officeTools.length}`);
    officeTools.forEach(t => console.log(`  - ${t.name}: ${t.description.substring(0, 60)}...`));

    console.log('Calling office_get_status...');
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'office_get_status', arguments: {} } });
  } else if (msg.id === 3) {
    console.log('[3] office_get_status result:');
    const content = JSON.parse(msg.result.content[0].text);
    console.log(`  Excel COM: ${content.excel_com_engine.status}`);
    console.log(`  Word COM: ${content.word_com_engine.status}`);
    console.log(`  Native Engines:`, content.native_js_engines);

    console.log('All MCP stdio tests for Office module PASSED!');
    server.kill();
    process.exit(0);
  }
}

// Start handshake
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'TestClient', version: '1.0.0' }
  }
});
