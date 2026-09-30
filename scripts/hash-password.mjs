import {randomBytes,scryptSync} from 'node:crypto';
import {stdin,stdout} from 'node:process';
if(!stdin.isTTY){console.error('请在终端中运行此脚本。');process.exit(1)}
stdin.setRawMode(true);stdin.resume();stdout.write('输入作者密码：');let password='';
stdin.on('data',chunk=>{const value=chunk.toString();if(value==='\r'||value==='\n'){stdin.setRawMode(false);stdin.pause();const salt=randomBytes(16).toString('hex');stdout.write(`\n\nAUTHOR_PASSWORD_HASH=${salt}:${scryptSync(password,salt,64).toString('hex')}\n`)}else if(value==='\u0003'){process.exit(130)}else if(value==='\u007f'){password=password.slice(0,-1)}else password+=value});
