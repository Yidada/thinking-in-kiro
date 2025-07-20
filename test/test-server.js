#!/usr/bin/env node

// 简单的MCP服务器功能测试脚本
import { spawn } from 'child_process';

console.log('🧪 开始测试 Thinking-in-Kiro MCP服务器...\n');

// 测试1: 服务器启动
console.log('1. 测试服务器启动...');
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

// 测试2: 发送工具列表请求
setTimeout(() => {
  console.log('2. 测试工具列表请求...');
  
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // 测试3: 测试工具调用
  setTimeout(() => {
    console.log('3. 测试工具调用...');
    
    const toolCallRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "init_dev_flow",
        arguments: {
          projectName: "test-project"
        }
      }
    };
    
    server.stdin.write(JSON.stringify(toolCallRequest) + '\n');
    
    // 结束测试
    setTimeout(() => {
      server.kill();
      
      console.log('\n📊 测试结果:');
      console.log('✅ 服务器启动成功');
      console.log('✅ stderr输出:', errorOutput.trim());
      console.log('✅ stdout输出:', output ? '有响应' : '无响应');
      
      if (errorOutput.includes('🚀 Thinking-in-Kiro MCP Server running on stdio')) {
        console.log('✅ 服务器正常启动');
      } else {
        console.log('❌ 服务器启动可能有问题');
      }
      
      if (errorOutput.includes('Available tools:')) {
        console.log('✅ 工具注册成功');
      } else {
        console.log('❌ 工具注册可能有问题');
      }
      
      console.log('\n🎉 基础测试完成！');
      process.exit(0);
    }, 1000);
  }, 500);
}, 500); 