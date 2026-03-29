"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const ws_1 = require("ws");
const generative_ai_1 = require("@google/generative-ai");
async function getGeminiKey(context) {
    let key = await context.secrets.get('gemini_api_key');
    if (!key) {
        key = await vscode.window.showInputBox({
            title: "Tepyx Neural Link",
            prompt: "Ingresa tu Google Gemini API Key",
            ignoreFocusOut: true,
            password: true
        });
        if (key) {
            await context.secrets.store('gemini_api_key', key);
            vscode.window.showInformationMessage("Antigravity: Gemini Key vinculada correctamente.");
        }
    }
    return key;
}
function activate(context) {
    const wss = new ws_1.WebSocketServer({
        port: 3010,
        verifyClient: (info) => {
            const origin = info.origin;
            const allowedOrigins = [
                'http://localhost:3000',
                'https://tepyx.yvagacore.com',
            ];
            return allowedOrigins.includes(origin);
        }
    });
    wss.on('connection', (ws) => {
        console.log('Tepyx Neural Bridge: Client Connected and Verified');
        ws.on('message', async (message) => {
            try {
                const request = JSON.parse(message.toString());
                if (request.type === 'ARCHITECT_REQUEST') {
                    vscode.window.showInformationMessage(`TEPYX_CORE: Iniciando orquestación ${request.core_id}...`);
                    const apiKey = await getGeminiKey(context);
                    if (!apiKey) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'API_KEY_REQUIRED' }));
                        return;
                    }
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: "Tepyx Architect",
                        cancellable: false
                    }, async (progress) => {
                        progress.report({ message: "Consultando a Gemini 2.5 Flash..." });
                        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({
                            model: "gemini-2.5-flash",
                            generationConfig: {
                                responseMimeType: "application/json",
                            }
                        });
                        const prompt = `
                        You are the SUPREME ARCHITECT of Tepyx (Yvagacore). Your specialty is designing industrial-grade autonomous AI infrastructures, similar to architectures found in n8n or LangGraph.

                        CURRENT CONTEXT:
                        - WORKSPACE NODES: ${JSON.stringify(request.nodes)}
                        - USER STRATEGIC DIRECTIVES (NOTES): ${request.user_notes.join(" | ")}

                        TASK:
                        Interpret the USER NOTES to create a professional and functional workflow. 

                        LANGUAGE RULES:
                        1. DEFAULT: All output content (labels, prompts, payloads) MUST be in ENGLISH.
                        2. ADAPTABILITY: If the user wrote the "NOTES" in Spanish, you must provide the output content in SPANISH to match their preference.

                        DESIGN RULES:
                        1. CREATIVE AUTONOMY: Generate system prompts for 'agents' and content for 'contexts' from scratch. They must be technical, detailed, and task-oriented.
                        2. PROFESSIONAL STRUCTURE:
                        - INPUT: Use 'context' nodes for knowledge bases or input variables.
                        - PROCESS: Use 'agent' nodes with robust System Prompts (including roles, constraints, and objectives).
                        - OUTPUT: Use 'actuator' nodes for final actions (e.g., "Send Slack", "Database Injection", "Trigger Webhook").
                        3. PERSISTENCE: Maintain existing nodes in the workspace, but optimize their edges or positions if necessary for the new flow.
                        4. EXPORT LOGIC: Design with a real execution engine in mind. Payloads must be clear and actionable.

                        AESTHETICS:
                        - Organize the flow from LEFT to RIGHT.
                        - Colors: Agents (#00ffaa), Contexts (#3b82f6), Actuators (#f59e0b), Notes (#a855f7).

                        OUTPUT STRUCTURE (STRICT RAW JSON):
                        {
                        "nodes": [
                            {
                            "id": "node_unique_id",
                            "type": "agent|context|actuator|note",
                            "position": { "x": number, "y": number },
                            "data": {
                                "label": "Technical Component Name",
                                "type": "agent|context|actuator|note",
                                "meta": { 
                                "payload": "Detailed system prompt or data content",
                                "model": "gemini-2.5-flash"
                                },
                                "color": "hex"
                            }
                            }
                        ],
                        "edges": [
                            { "id": "e_id", "source": "source_id", "target": "target_id", "animated": true }
                        ],
                        "ai_comment": "Brief technical explanation of the designed flow."
                        }

                        Return ONLY the raw JSON. Do not add any text before or after the JSON block.
                        `;
                        try {
                            const result = await model.generateContent(prompt);
                            const aiResponse = result.response.text();
                            progress.report({ message: "Sincronizando topología neural..." });
                            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                const proposal = JSON.parse(jsonMatch[0]);
                                ws.send(JSON.stringify({
                                    type: 'DESIGN_PROPOSAL',
                                    ...proposal,
                                    ai_comment: "Protocolo arquitectado con éxito por Gemini 2.5 Flash."
                                }));
                                vscode.window.showInformationMessage("TEPYX_CORE: Workspace actualizado.");
                            }
                            else {
                                throw new Error("La IA no devolvió un formato JSON válido.");
                            }
                        }
                        catch (error) {
                            vscode.window.showErrorMessage(`TEPYX_IA_ERROR: ${error.message}`, "Resetear API Key").then(selection => {
                                if (selection === "Resetear API Key") {
                                    vscode.commands.executeCommand('antigravity-tepyx-bridge.resetKey');
                                }
                            });
                            ws.send(JSON.stringify({ type: 'ERROR', message: 'IA_PROCESSING_FAILED' }));
                        }
                    });
                }
            }
            catch (err) {
                console.error("Bridge Critical Error:", err);
                vscode.window.showErrorMessage("TEPYX_BRIDGE_CRITICAL: Error en el flujo de datos.");
            }
        });
    });
    context.subscriptions.push(vscode.commands.registerCommand('antigravity-tepyx-bridge.resetKey', async () => {
        await context.secrets.delete('gemini_api_key');
        vscode.window.showInformationMessage("Tepyx: Credenciales de Gemini eliminadas.");
    }));
    console.log('Antigravity Bridge (Secure Mode) active on port 3010');
}
