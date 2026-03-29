"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
var vscode = require("vscode");
var ws_1 = require("ws");
function activate(context) {
    var wss = new ws_1.WebSocketServer({ port: 3010 });
    wss.on('connection', function (ws) {
        console.log('Tepyx Web connected to Antigravity Local Bridge');
        ws.on('message', function (data) {
            var protocol = JSON.parse(data.toString());
            // Aquí notificamos a Antigravity que hay un nuevo diseño
            vscode.window.showInformationMessage("Tepyx Protocol Received: ".concat(protocol.core_id));
            // Lógica para guardar el archivo localmente
            // fs.writeFileSync('~/antigravity/workspace.json', data.toString());
        });
    });
    console.log('Antigravity Bridge is now active on port 3010');
}
