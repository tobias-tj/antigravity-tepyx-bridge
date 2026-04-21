import * as vscode from 'vscode';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenerativeAI } from "@google/generative-ai";

async function getGeminiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
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

export function activate(context: vscode.ExtensionContext) {
    const wss = new WebSocketServer({
        port: 3010,
        verifyClient: (info: { origin: any; }) => {
            const origin = info.origin;
            const allowedOrigins = [
                'https://tepyx.yvagacore.com',
            ];
            return allowedOrigins.includes(origin);
        }
    });

    wss.on('connection', (ws: WebSocket) => {
        console.log('Tepyx Neural Bridge: Client Connected and Verified');

        ws.on('message', async (message: string) => {
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

                        const genAI = new GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({
                            model: "gemini-2.5-flash",
                            generationConfig: {
                                responseMimeType: "application/json",
                            }
                        });

                        const prompt = `
                        You are the SUPREME ARCHITECT of Tepyx (Yvagacore). Your specialty is designing industrial-grade autonomous AI infrastructures.

                        CURRENT CONTEXT:
                        - WORKSPACE NODES: ${JSON.stringify(request.nodes)}
                        - USER STRATEGIC DIRECTIVES (NOTES): ${request.user_notes.join(" | ")}

                        SYSTEM TOOLSET (Use these for 'actuator' types):
                        - GMAIL: Use for sending emails, reports, or notifications.
                        - X_POST: Use for social media automation or public updates.
                        - PDF: Use for document generation, invoices, or reports.
                        - WEBHOOK: Use for Webhooks, external API calls, or triggering n8n workflows.
                        - JS_CODE: Use for complex data transformation, filtering, or custom logic.
                        - POSTGRES: Use for database operations, such as inserting, updating, deleting, or querying data.

                        DESIGN RULES:
                        1. CREATIVE AUTONOMY: Generate technical, task-oriented payloads.
                        2. PROFESSIONAL STRUCTURE:
                        - INPUT: Use 'context' nodes for data or variables.
                        - PROCESS: Use 'agent' nodes for AI logic.
                        - SYSTEM ACTION: If the user needs to send an email, call an API, or transform data, use the specific 'actuator' labels from the SYSTEM TOOLSET above.
                        3. N8N OPTIMIZATION: When creating 'actuator' nodes, ensure the 'meta.payload' contains structured instructions that can be easily mapped to a real API or service.
                        4. PERSISTENCE: Maintain and optimize existing nodes.
                        5. AESTHETICS: Organize LEFT to RIGHT. 

                        OUTPUT STRUCTURE (STRICT RAW JSON):
                        {
                            "nodes": [
                                {
                                    "id": "node_unique_id",
                                    "type": "agent|context|actuator|note",
                                    "position": { "x": number, "y": number },
                                    "data": {
                                        "label": "GMAIL|WEBHOOK|JS_CODE|X_POST|PDF|POSTGRES|Technical Name", 
                                        "type": "agent|context|actuator|note",
                                        "meta": { 
                                            "payload": "Detailed instructions for the actuator or system prompt for agent",
                                            "model": "gemini-2.5-flash" 
                                        },
                                        "color": "hex"
                                    }
                                }
                            ],
                            "edges": [
                                { "id": "e_id", "source": "source_id", "target": "target_id", "animated": true }
                            ],
                            "ai_comment": "Brief technical explanation."
                        }

                        Return ONLY the raw JSON.`;

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
                            } else {
                                throw new Error("La IA no devolvió un formato JSON válido.");
                            }
                        } catch (error: any) {
                            vscode.window.showErrorMessage(
                                `TEPYX_IA_ERROR: ${error.message}`,
                                "Resetear API Key"
                            ).then(selection => {
                                if (selection === "Resetear API Key") {
                                    vscode.commands.executeCommand('antigravity-tepyx-bridge.resetKey');
                                }
                            });
                            ws.send(JSON.stringify({ type: 'ERROR', message: 'IA_PROCESSING_FAILED' }));
                        }
                    });
                }
            } catch (err: any) {
                console.error("Bridge Critical Error:", err);
                vscode.window.showErrorMessage("TEPYX_BRIDGE_CRITICAL: Error en el flujo de datos.");
            }
        });
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('antigravity-tepyx-bridge.resetKey', async () => {
            await context.secrets.delete('gemini_api_key');
            vscode.window.showInformationMessage("Tepyx: Credenciales de Gemini eliminadas.");
        })
    );

    console.log('Antigravity Bridge (Secure Mode) active on port 3010');
}